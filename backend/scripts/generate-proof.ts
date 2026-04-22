/**
 * ZK Proof Generator
 * ─────────────────────────────────────────────────────────
 * Generates a Groth16 ZK proof from an EAS attestation.
 *
 * This runs entirely client-side (in browser or Node.js).
 * NO server involved. The private CGPA never leaves the device.
 *
 * Flow:
 *   1. Load EAS attestation (from sample_attestation.json)
 *   2. Compute Poseidon hash of studentId (matches circuit constraint)
 *   3. Build circuit input.json: {cgpa, studentId, threshold, studentIdHash}
 *   4. Generate Groth16 witness via WebAssembly
 *   5. Generate Groth16 proof using snarkjs
 *   6. Save proof.json + public.json → ready for on-chain submission
 *
 * Run:
 *   ts-node scripts/generate-proof.ts
 *
 * Output files:
 *   circuits/build/proof.json      → Groth16 proof (submit on-chain)
 *   circuits/build/public.json     → Public signals [threshold, studentIdHash]
 */

import { buildPoseidon } from "circomlibjs";
import * as snarkjs from "snarkjs";
import * as fs from "fs";
import * as path from "path";

// ── Configuration ──────────────────────────────────────────────────
const BUILD_DIR = path.join(__dirname, "..", "circuits", "build");
const TEST_DIR = path.join(__dirname, "..", "circuits", "test");

// Threshold set by the employer (could be dynamic in production)
const EMPLOYER_THRESHOLD = 800; // 8.00 GPA minimum

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Converts a hex bytes32 string to a BigInt field element
 * compatible with the Circom circuit.
 */
function bytes32ToField(hex: string): bigint {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  return BigInt("0x" + cleanHex.padEnd(64, "0").slice(0, 64));
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log("════════════════════════════════════════════");
  console.log("  ZK Resume — Proof Generator");
  console.log("════════════════════════════════════════════");

  // ── Step 1: Load EAS Attestation ─────────────────────────────────
  const attestationPath = path.join(TEST_DIR, "sample_attestation.json");
  if (!fs.existsSync(attestationPath)) {
    throw new Error(
      "Attestation not found. Run eas-attest.ts first to generate it."
    );
  }

  const { decodedData } = JSON.parse(
    fs.readFileSync(attestationPath, "utf-8")
  );

  const cgpa = decodedData.cgpa; // e.g. 850
  const studentIdHex = decodedData.studentId;

  console.log(`  CGPA (private): ${cgpa / 100} (${cgpa})`);
  console.log(`  Threshold     : ${EMPLOYER_THRESHOLD / 100} (${EMPLOYER_THRESHOLD})`);

  // ── Step 2: Compute Poseidon Hash of Student ID ───────────────────
  // This must match what was registered in the attestation.
  // The hash is PUBLIC — the raw ID stays private.
  console.log("\n  Computing Poseidon hash of studentId...");
  const poseidon = await buildPoseidon();
  const studentIdField = bytes32ToField(studentIdHex);
  const hashResult = poseidon([studentIdField]);
  const studentIdHash = poseidon.F.toObject(hashResult);

  console.log(`  studentIdHash (public): ${studentIdHash}`);

  // ── Step 3: Build Circuit Inputs ─────────────────────────────────
  const input = {
    // Private inputs (never revealed)
    cgpa: cgpa,
    studentId: studentIdField.toString(),

    // Public inputs (verifier sees these)
    threshold: EMPLOYER_THRESHOLD,
    studentIdHash: studentIdHash.toString(),
  };

  const inputPath = path.join(BUILD_DIR, "input.json");
  fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));
  console.log("\n  ✓ input.json written");

  // ── Step 4: Generate Witness ──────────────────────────────────────
  console.log("  Generating witness...");
  const wasmPath = path.join(BUILD_DIR, "resume_js", "resume.wasm");
  const witnessPath = path.join(BUILD_DIR, "witness.wtns");

  if (!fs.existsSync(wasmPath)) {
    throw new Error(
      `WASM not found at ${wasmPath}. Run: circom circuits/resume.circom --wasm -o circuits/build`
    );
  }

  await snarkjs.wtns.calculate(input, wasmPath, witnessPath);
  console.log("  ✓ Witness generated");

  // ── Step 5: Generate Groth16 Proof ───────────────────────────────
  console.log("  Computing Groth16 proof (~2s)...");
  const zkeyPath = path.join(BUILD_DIR, "resume_final.zkey");

  if (!fs.existsSync(zkeyPath)) {
    throw new Error(
      `zkey not found at ${zkeyPath}. Complete the trusted setup ceremony first.`
    );
  }

  const { proof, publicSignals } = await snarkjs.groth16.prove(
    zkeyPath,
    witnessPath
  );

  // ── Step 6: Save Proof Files ──────────────────────────────────────
  const proofPath = path.join(BUILD_DIR, "proof.json");
  const publicPath = path.join(BUILD_DIR, "public.json");

  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  fs.writeFileSync(publicPath, JSON.stringify(publicSignals, null, 2));

  console.log("  ✓ proof.json saved");
  console.log("  ✓ public.json saved");

  // ── Step 7: Local Verification Check ─────────────────────────────
  console.log("\n  Verifying proof locally...");
  const vkeyPath = path.join(BUILD_DIR, "verification_key.json");

  if (!fs.existsSync(vkeyPath)) {
    throw new Error("verification_key.json not found. Export it from the zkey first.");
  }

  const vkey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
  const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);

  if (!isValid) {
    throw new Error("Proof verification FAILED locally. Check your inputs.");
  }

  // ── Format for On-chain Submission ───────────────────────────────
  // Converts proof to calldata format for ResumeRegistry.verifyCredential()
  const calldata = await snarkjs.groth16.exportSolidityCallData(
    proof,
    publicSignals
  );

  const calldataPath = path.join(BUILD_DIR, "calldata.json");
  fs.writeFileSync(calldataPath, JSON.stringify({ calldata }, null, 2));

  console.log("\n════════════════════════════════════════════");
  console.log("  ✅ Proof Generated Successfully");
  console.log("════════════════════════════════════════════");
  console.log(`  Proof valid  : ${isValid}`);
  console.log(`  Public signals: [${publicSignals.join(", ")}]`);
  console.log(`  proof.json   → circuits/build/proof.json`);
  console.log(`  calldata.json→ circuits/build/calldata.json`);
  console.log("\n  Submit via ResumeRegistry.verifyCredential() on Sepolia.");
}

main().catch((e) => {
  console.error("❌ Proof generation failed:", e.message);
  process.exit(1);
});
