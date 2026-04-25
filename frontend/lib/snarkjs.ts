/**
 * SnarkJS Library — In-Browser ZK Proof Generation
 * ─────────────────────────────────────────────────────
 * Generates Groth16 proofs entirely in the browser using WebAssembly.
 * The student's CGPA never leaves their device.
 *
 * Requires circuit artifacts (.wasm, .zkey, vkey.json) to be placed
 * in /public/circuits/ so Next.js serves them statically.
 */

"use client";

import type { SignedAttestation } from "./eas";

export interface ProofInput {
  cgpa: number;             // private: actual CGPA ×100
  studentId: string;        // private: bytes32 hex
  threshold: number;        // public: employer minimum ×100
}

export interface GeneratedProof {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];  // [threshold, studentIdHash]
  calldata: {
    pA: [bigint, bigint];
    pB: [[bigint, bigint], [bigint, bigint]];
    pC: [bigint, bigint];
    pubSignals: [bigint, bigint, bigint];   // [qualified, threshold, studentIdHash]
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

/**
 * Compute Poseidon hash of studentId in the browser.
 * Uses circomlibjs dynamically imported to avoid SSR issues.
 */
async function poseidonHash(studentIdHex: string): Promise<bigint> {
  // @ts-ignore
  const { buildPoseidon } = await import("circomlibjs");
  const poseidon = await buildPoseidon();

  const cleanHex = studentIdHex.startsWith("0x")
    ? studentIdHex.slice(2)
    : studentIdHex;
  const studentIdBig = BigInt("0x" + cleanHex.padEnd(64, "0").slice(0, 64));

  const result = poseidon([studentIdBig]);
  return poseidon.F.toObject(result) as bigint;
}

/**
 * Generate a Groth16 ZK proof in the browser.
 * Reports progress via onStep callback.
 *
 * @param input      Proof inputs (cgpa private, threshold public)
 * @param onStep     Progress callback for UI updates
 */
export async function generateProof(
  input: ProofInput,
  onStep: (step: ProofStep, message?: string) => void
): Promise<GeneratedProof> {
  // @ts-ignore
  const snarkjs = await import("snarkjs");

  try {
    // ── Step 1: Hash the studentId ────────────────────────────────
    onStep("hashing", "Computing Poseidon hash...");
    const studentIdHash = await poseidonHash(input.studentId);

    // ── Step 2: Build circuit inputs ──────────────────────────────
    const circuitInput = {
      cgpa:          input.cgpa,
      studentId:     BigInt("0x" + input.studentId.replace("0x", "").padEnd(64, "0").slice(0, 64)).toString(),
      threshold:     input.threshold,
      studentIdHash: studentIdHash.toString(),
    };

    // ── Step 3: Generate witness ──────────────────────────────────
    onStep("witness", "Generating witness...");
    const wasmPath = "/circuits/resume.wasm";
    const zkeyPath = "/circuits/resume_final.zkey";

    // Fetch WASM file
    const wasmRes = await fetch(wasmPath);
    if (!wasmRes.ok) {
      throw new Error("Circuit WASM not found. Place circuit artifacts in /public/circuits/");
    }
    const wasmBuffer = await wasmRes.arrayBuffer();

    // Fetch zkey
    const zkeyRes = await fetch(zkeyPath);
    if (!zkeyRes.ok) {
      throw new Error("ZKey not found. Place resume_final.zkey in /public/circuits/");
    }
    const zkeyBuffer = await zkeyRes.arrayBuffer();

    const { proof, publicSignals } = await (snarkjs as any).groth16.fullProve(
      circuitInput,
      new Uint8Array(wasmBuffer),
      new Uint8Array(zkeyBuffer)
    );

    // ── Step 4: Local verification ────────────────────────────────
    onStep("verifying", "Verifying proof locally...");
    const vkeyRes = await fetch("/circuits/verification_key.json");
    const vkey = await vkeyRes.json();
    const isValid = await (snarkjs as any).groth16.verify(vkey, publicSignals, proof);

    if (!isValid) throw new Error("Local proof verification failed");

    // ── Step 5: Format calldata for Solidity ──────────────────────
    onStep("proving", "Formatting for on-chain submission...");
    const calldataRaw = await (snarkjs as any).groth16.exportSolidityCallData(
      proof,
      publicSignals
    );
    const parsed = JSON.parse(`[${calldataRaw}]`);

    onStep("done", "Proof ready!");

    return {
      proof,
      publicSignals,
      calldata: {
        pA: parsed[0] as [bigint, bigint],
        pB: parsed[1] as [[bigint, bigint], [bigint, bigint]],
        pC: parsed[2] as [bigint, bigint],
        pubSignals: parsed[3] as [bigint, bigint, bigint],
      },
    };
  } catch (err: any) {
    onStep("error", err.message);
    throw err;
  }
}

/**
 * Download proof files to the student's device.
 */
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

/**
 * Build circuit inputs from a signed EAS attestation.
 */
export function buildProofInputFromAttestation(
  attestation: SignedAttestation,
  threshold: number
): ProofInput {
  return {
    cgpa:      attestation.decodedData.cgpa,
    studentId: attestation.decodedData.studentId,
    threshold,
  };
}
