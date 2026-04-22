/**
 * EAS Library — Off-chain Attestation Creation
 * ─────────────────────────────────────────────────────
 * Wraps EAS SDK for use in the browser (Next.js client components).
 * No backend needed — attestation is signed client-side by the university.
 */

import {
  EAS,
  SchemaEncoder,
  NO_EXPIRATION,
} from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import { CONTRACTS, SCHEMA_UID } from "./wagmi";

export interface AttestationInput {
  studentId: string;       // bytes32 hex string
  cgpa: number;            // scaled ×100, e.g. 850 for 8.50
  degree: string;
  studentWallet: string;   // recipient address
}

export interface SignedAttestation {
  uid: string;
  attestation: object;
  decodedData: AttestationInput;
  meta: {
    university: string;
    createdAt: string;
    schemaUID: string;
  };
}

/**
 * Create and sign an EAS off-chain attestation.
 * Called by the university dashboard.
 * Gasless — no transaction is sent.
 */
export async function createOffchainAttestation(
  input: AttestationInput,
  signer: ethers.Signer
): Promise<SignedAttestation> {
  const eas = new EAS(CONTRACTS.EAS_SEPOLIA);
  eas.connect(signer);

  const schemaEncoder = new SchemaEncoder(
    "bytes32 studentId, uint256 cgpa, string degree"
  );

  const encodedData = schemaEncoder.encodeData([
    { name: "studentId", value: input.studentId as `0x${string}`, type: "bytes32" },
    { name: "cgpa",      value: input.cgpa,                        type: "uint256" },
    { name: "degree",    value: input.degree,                      type: "string" },
  ]);

  const offchain = await eas.getOffchain();
  const universityAddress = await signer.getAddress();

  const attestation = await offchain.signOffchainAttestation(
    {
      schema: SCHEMA_UID as `0x${string}`,
      recipient: input.studentWallet as `0x${string}`,
      time: BigInt(Math.floor(Date.now() / 1000)),
      expirationTime: NO_EXPIRATION,
      revocable: true,
      refUID: ethers.ZeroHash as `0x${string}`,
      data: encodedData as `0x${string}`,
    },
    signer as any
  );

  return {
    uid: attestation.uid,
    attestation,
    decodedData: input,
    meta: {
      university: universityAddress,
      createdAt: new Date().toISOString(),
      schemaUID: SCHEMA_UID,
    },
  };
}

/**
 * Sign the message that ResumeRegistry.verifyCredential() will verify.
 * The university signs: keccak256(attestationUID, threshold, studentIdHash)
 */
export async function signRegistryMessage(
  attestationUID: string,
  threshold: number,
  studentIdHash: bigint,
  signer: ethers.Signer
): Promise<string> {
  const messageHash = ethers.keccak256(
    ethers.solidityPacked(
      ["bytes32", "uint256", "uint256"],
      [attestationUID, threshold, studentIdHash]
    )
  );
  return await signer.signMessage(ethers.getBytes(messageHash));
}

/**
 * Download attestation as a JSON file (for student to store locally).
 */
export function downloadAttestation(attestation: SignedAttestation) {
  const blob = new Blob([JSON.stringify(attestation, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attestation-${attestation.uid.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
