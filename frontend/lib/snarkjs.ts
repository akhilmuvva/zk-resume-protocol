// snarkjs.ts - in-browser groth16 proofs
// private data (cgpa, id) stays local.

"use client";

import type { SignedAttestation } from "./eas";
import type { SnarkProof, VerificationKey, SnarkJS, CircomlibJS } from "./types/zk";

export interface ProofInput {
  cgpa:      number;   
  studentId: string;   
  threshold: number;   
}

export interface GeneratedProof {
  proof: SnarkProof;
  publicSignals: string[];   
  calldata: {
    pA:         [bigint, bigint];
    pB:         [[bigint, bigint], [bigint, bigint]];
    pC:         [bigint, bigint];
    pubSignals: [bigint, bigint, bigint]; 
  };
}

export type ProofStep =
  | "idle"
  | "hashing"
  | "witness"
  | "proving"
  | "verifying"
  | "done"
  | "error";

// poseidon hash for the id
async function poseidonHash(studentIdHex: string): Promise<bigint> {
  const { buildPoseidon } = await import("circomlibjs") as unknown as CircomlibJS;
  const poseidon = await buildPoseidon();

  const cleanHex = studentIdHex.startsWith("0x")
    ? studentIdHex.slice(2)
    : studentIdHex;
  
  // Pad and slice to ensure 32 bytes
  const studentIdBig = BigInt("0x" + cleanHex.padEnd(64, "0").slice(0, 64));

  const result = poseidon([studentIdBig]);
  return poseidon.F.toObject(result) as bigint;
}

// generating the proof
export async function generateProof(
  input:  ProofInput,
  onStep: (step: ProofStep, message?: string) => void
): Promise<GeneratedProof> {
  const snarkjs = await import("snarkjs") as unknown as SnarkJS;

  try {
    onStep("hashing", "Computing Poseidon hash...");
    const studentIdHash = await poseidonHash(input.studentId);

    const circuitInput: Record<string, string> = {
      cgpa:          String(input.cgpa),
      studentId:     BigInt("0x" + input.studentId.replace("0x", "").padEnd(64, "0").slice(0, 64)).toString(),
      threshold:     String(input.threshold),
      studentIdHash: studentIdHash.toString(),
    };

    onStep("witness", "Loading circuit files...");
    const wasmPath = "/circuits/resume.wasm";
    const zkeyPath = "/circuits/resume_final.zkey";

    // load artifacts
    const [wasmRes, zkeyRes] = await Promise.all([
      fetch(wasmPath),
      fetch(zkeyPath)
    ]);

    if (!wasmRes.ok || !zkeyRes.ok) {
      throw new Error("Circuit files missing in /public/circuits/");
    }

    const [wasmBuffer, zkeyBuffer] = await Promise.all([
      wasmRes.arrayBuffer(),
      zkeyRes.arrayBuffer()
    ]);

    onStep("proving", "Generating ZK proof (this might take a second)...");
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      circuitInput,
      new Uint8Array(wasmBuffer),
      new Uint8Array(zkeyBuffer)
    );

    onStep("verifying", "Running a quick local check...");
    const vkeyRes = await fetch("/circuits/verification_key.json");
    const vkey: VerificationKey = await vkeyRes.json();
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);

    if (!isValid) throw new Error("Local verification failed - proof is corrupted.");

    onStep("proving", "Formatting calldata for contract...");
    const calldataRaw = await snarkjs.groth16.exportSolidityCallData(
      proof,
      publicSignals
    );
    
    // cleanup calldata for the contract
    const parsed = JSON.parse(`[${calldataRaw}]`) as [
      [bigint, bigint],
      [[bigint, bigint], [bigint, bigint]],
      [bigint, bigint],
      [bigint, bigint, bigint]
    ];

    onStep("done", "Proof generated successfully!");

    return {
      proof,
      publicSignals,
      calldata: {
        pA:         parsed[0],
        pB:         parsed[1],
        pC:         parsed[2],
        pubSignals: parsed[3],
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    onStep("error", message);
    throw err;
  }
}

// export files
export function downloadProofFiles(proof: GeneratedProof) {
  const files = [
    { name: "proof.json",  content: proof.proof },
    { name: "public.json", content: proof.publicSignals },
  ];

  files.forEach(({ name, content }) => {
    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function buildProofInputFromAttestation(
  attestation: SignedAttestation,
  threshold:   number
): ProofInput {
  return {
    cgpa:      attestation.decodedData.cgpa,
    studentId: attestation.decodedData.studentId,
    threshold,
  };
}
