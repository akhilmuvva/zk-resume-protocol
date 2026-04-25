/**
 * eas.ts
 * Browser-side EAS logic for creating off-chain attestations.
 */

import {
  EAS,
  SchemaEncoder,
  NO_EXPIRATION,
} from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import { CONTRACTS, SCHEMA_UID } from "./wagmi";

export interface AttestationInput {
  studentId: string;       // bytes32 hex
  cgpa: number;            // scaled x100
  degree: string;
  studentWallet: string;   
}

export interface EASOffchainAttestation {
  uid:     string;
  sig:     { v: number; r: string; s: string };
  message: {
    schema:         string;
    recipient:      string;
    time:           bigint;
    expirationTime: bigint;
    revocable:      boolean;
    refUID:         string;
    data:           string;
  };
}

export interface SignedAttestation {
  uid:         string;
  attestation: EASOffchainAttestation;
  decodedData: AttestationInput;
  meta: {
    university: string;
    createdAt:  string;
    schemaUID:  string;
  };
}

/**
 * Creates an off-chain attestation signed by the university.
 * Gasless and entirely client-side.
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
    signer as ethers.Signer
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
 * Signs the specific hash required for the ResumeRegistry.sol verifyCredential() call.
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

// Download utility for the JSON attestation file.
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
