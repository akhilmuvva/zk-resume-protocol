/**
 * EAS Off-chain Attestation Script
 * ─────────────────────────────────────────────────────────
 * This script creates a signed EAS attestation for a student.
 * The attestation is signed by the university's private key
 * but NOT submitted on-chain (gasless for the university).
 *
 * The student later uses this signature + a ZK proof to
 * prove their credential on-chain via ResumeRegistry.
 *
 * Pure decentralized flow:
 *   University → signs off-chain EAS attestation
 *   Student    → stores attestation + generates ZK proof
 *   Employer   → calls ResumeRegistry.verifyCredential()
 *
 * Run:
 *   ts-node scripts/eas-attest.ts
 */

import {
  EAS,
  SchemaEncoder,
  NO_EXPIRATION,
} from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

// ── Configuration ──────────────────────────────────────────────────
const EAS_CONTRACT_SEPOLIA = "0xC2679fBD37d54388Ce493F1DB75320D236e1815e";
const SCHEMA_UID = process.env.SCHEMA_UID || "";

// Attestation data (would come from university's form UI in production)
const ATTESTATION_DATA = {
  studentId:
    "0x72a56193000000000000000000000000000000000000000000000000000000c9f1", // bytes32
  cgpa: 850, // 8.50 × 100 = 850 (same scale as circuit)
  degree: "B.S. Computer Science",
  studentWallet: "0x83B4F9Ec2A1d3bC7f0000000000000000004F9E2", // student's address
};

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_URL);
  const universitySigner = new ethers.Wallet(
    process.env.PRIVATE_KEY!,
    provider
  );

  console.log("════════════════════════════════════════════");
  console.log("  ZK Resume — EAS Attestation (Off-chain)");
  console.log("════════════════════════════════════════════");
  console.log(`  University  : ${universitySigner.address}`);
  console.log(`  Student     : ${ATTESTATION_DATA.studentWallet}`);
  console.log(`  CGPA        : ${ATTESTATION_DATA.cgpa / 100}`);
  console.log(`  Schema UID  : ${SCHEMA_UID}`);

  // ── Initialize EAS ───────────────────────────────────────────────
  const eas = new EAS(EAS_CONTRACT_SEPOLIA);
  eas.connect(universitySigner);

  // ── Encode Schema Data ───────────────────────────────────────────
  // Schema: bytes32 studentId, uint256 cgpa, string degree
  const schemaEncoder = new SchemaEncoder(
    "bytes32 studentId, uint256 cgpa, string degree"
  );

  const encodedData = schemaEncoder.encodeData([
    {
      name: "studentId",
      value: ATTESTATION_DATA.studentId,
      type: "bytes32",
    },
    {
      name: "cgpa",
      value: ATTESTATION_DATA.cgpa,
      type: "uint256",
    },
    {
      name: "degree",
      value: ATTESTATION_DATA.degree,
      type: "string",
    },
  ]);

  // ── Create Off-chain Attestation ─────────────────────────────────
  // This does NOT send a transaction. It creates a signed message
  // that the student can store and later use for ZK proof generation.
  const offchainEAS = await eas.getOffchain();

  const attestation = await offchainEAS.signOffchainAttestation(
    {
      schema: SCHEMA_UID,
      recipient: ATTESTATION_DATA.studentWallet as `0x${string}`,
      time: BigInt(Math.floor(Date.now() / 1000)),
      expirationTime: NO_EXPIRATION,
      revocable: true,
      refUID: ethers.ZeroHash as `0x${string}`,
      data: encodedData as `0x${string}`,
    },
    universitySigner
  );

  // ── Save Attestation ─────────────────────────────────────────────
  const attestationOutput = {
    meta: {
      createdAt: new Date().toISOString(),
      university: universitySigner.address,
      student: ATTESTATION_DATA.studentWallet,
      network: "sepolia",
      schemaUID: SCHEMA_UID,
      easContractAddress: EAS_CONTRACT_SEPOLIA,
    },
    attestation,
    decodedData: {
      studentId: ATTESTATION_DATA.studentId,
      cgpa: ATTESTATION_DATA.cgpa,
      degree: ATTESTATION_DATA.degree,
    },
    // These values feed directly into the ZK circuit
    circuitInputs: {
      cgpa: ATTESTATION_DATA.cgpa, // private input
      studentId: ATTESTATION_DATA.studentId, // private input
    },
  };

  const outputDir = path.join(__dirname, "..", "circuits", "test");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "sample_attestation.json");
  fs.writeFileSync(outputPath, JSON.stringify(attestationOutput, null, 2));

  console.log("\n  ✓ Attestation signed (gasless — no tx sent)");
  console.log(`  ✓ Saved to: circuits/test/sample_attestation.json`);
  console.log(`  ✓ UID: ${attestation.uid}`);
  console.log("\n  Next: Student runs generate-proof.ts using this attestation.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
