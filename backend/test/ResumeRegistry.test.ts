import { expect } from "chai";
import { ethers } from "hardhat";
import * as snarkjs from "snarkjs";
import * as path from "path";
import * as fs from "fs";
import { buildPoseidon } from "circomlibjs";
import { ResumeRegistry } from "../typechain-types";

const BUILD_DIR = path.join(__dirname, "..", "circuits", "build");

/**
 * Helper: Generate a Groth16 proof for given inputs.
 * Returns formatted calldata for Solidity.
 */
async function generateProof(
  cgpa: number,
  threshold: number,
  studentId: bigint,
  poseidon: any
): Promise<{
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  pubSignals: [bigint, bigint, bigint]; // [qualified, threshold, studentIdHash]
}> {
  const hashResult = poseidon([studentId]);
  const studentIdHash = poseidon.F.toObject(hashResult);

  const input = {
    cgpa: cgpa,
    studentId: studentId.toString(),
    threshold: threshold,
    studentIdHash: studentIdHash.toString(),
  };

  const wasmPath = path.join(BUILD_DIR, "resume_js", "resume.wasm");
  const zkeyPath = path.join(BUILD_DIR, "resume_final.zkey");

  // Skip if circuit artifacts don't exist (CI without circuit compilation)
  if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
    throw new Error("Circuit artifacts not found. Run circuit compilation first.");
  }

  const witnessPath = path.join(BUILD_DIR, `witness_test_${Date.now()}.wtns`);
  await snarkjs.wtns.calculate(input, wasmPath, witnessPath);

  const { proof, publicSignals } = await snarkjs.groth16.prove(
    zkeyPath,
    witnessPath
  );

  // Clean up witness file
  if (fs.existsSync(witnessPath)) fs.unlinkSync(witnessPath);

  // Format for Solidity
  const calldata = await snarkjs.groth16.exportSolidityCallData(
    proof,
    publicSignals
  );

  // Parse the calldata string into arrays
  const parsed = JSON.parse(`[${calldata}]`);
  return {
    pA: parsed[0],
    pB: parsed[1],
    pC: parsed[2],
    pubSignals: parsed[3],
  };
}

// ─────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────

describe("ResumeRegistry — ZK + EAS Verification", function () {
  this.timeout(120_000); // ZK proof takes ~2s

  let resumeRegistry: ResumeRegistry;
  let owner: any, university: any, student: any, employer: any;
  let poseidon: any;
  const STUDENT_ID = BigInt("0x72a56193c9f100000000000000000000000000000000000000000000000000");

  before(async () => {
    [owner, university, student, employer] = await ethers.getSigners();
    poseidon = await buildPoseidon();

    // ── Deploy Groth16 Verifier (auto-generated) ───────────────────
    // In tests, we use a mock verifier for speed if circuit not compiled.
    // In production tests, use the real Groth16Verifier.
    let verifierAddress: string;

    const circuitReady =
      fs.existsSync(path.join(BUILD_DIR, "resume_js", "resume.wasm")) &&
      fs.existsSync(path.join(BUILD_DIR, "resume_final.zkey"));

    if (circuitReady) {
      const Verifier = await ethers.getContractFactory("Groth16Verifier");
      const verifier = await Verifier.deploy();
      verifierAddress = await verifier.getAddress();
    } else {
      // Deploy mock verifier that always returns true (for contract logic tests)
      const MockVerifier = await ethers.getContractFactory("MockVerifier");
      const mock = await MockVerifier.deploy();
      verifierAddress = await mock.getAddress();
      console.log("  ⚠️  Using MockVerifier — circuit artifacts not found");
    }

    // ── Deploy ResumeRegistry ──────────────────────────────────────
    const Registry = await ethers.getContractFactory("ResumeRegistry");
    resumeRegistry = (await Registry.deploy(verifierAddress)) as ResumeRegistry;

    // ── Register University ────────────────────────────────────────
    await resumeRegistry
      .connect(owner)
      .registerUniversity(university.address, "MIT ZK Lab");
  });

  // ── Helper: Create valid EAS signature ──────────────────────────
  async function createEASSignature(
    attestationUID: string,
    threshold: number,
    studentIdHash: bigint,
    signer: any
  ): Promise<string> {
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(
        ["bytes32", "uint256", "uint256"],
        [attestationUID, threshold, studentIdHash]
      )
    );
    return await signer.signMessage(ethers.getBytes(messageHash));
  }

  // ─────────────────────────────────────────────────────────────────
  // Test 1: Valid proof, CGPA above threshold → PASS ✓
  // ─────────────────────────────────────────────────────────────────
  it("Test 1: Valid proof + cgpa (850) above threshold (800) → verifies ✓", async function () {
    const threshold = 800;
    const attestationUID = ethers.randomBytes(32);
    const attestationUIDHex = ethers.hexlify(attestationUID);

    // Compute studentIdHash for signature
    const hashResult = poseidon([STUDENT_ID]);
    const studentIdHash = poseidon.F.toObject(hashResult);

    // Create university EAS signature
    const sig = await createEASSignature(
      attestationUIDHex,
      threshold,
      studentIdHash,
      university
    );

    // Generate a real Groth16 proof using the compiled circuit
    const realProof = await generateProof(850, threshold, STUDENT_ID, poseidon);

    const tx = await resumeRegistry.connect(student).verifyCredential(
      realProof.pA,
      realProof.pB,
      realProof.pC,
      realProof.pubSignals,
      attestationUIDHex,
      sig
    );

    const receipt = await tx.wait();
    expect(receipt?.status).to.equal(1);

    const [qualified] = await resumeRegistry.checkQualification(
      student.address,
      threshold
    );
    expect(qualified).to.be.true;

    console.log(`  Gas used: ${receipt?.gasUsed.toString()} units`);
  });

  // ─────────────────────────────────────────────────────────────────
  // Test 2: Attestation replay attack → FAIL (AttestationAlreadyUsed)
  // ─────────────────────────────────────────────────────────────────
  it("Test 2: Replaying same attestation UID → reverts ✓", async function () {
    const REUSED_UID = ethers.hexlify(ethers.randomBytes(32));
    const threshold = 700;

    const hashResult = poseidon([STUDENT_ID]);
    const studentIdHash = poseidon.F.toObject(hashResult);
    const sig = await createEASSignature(REUSED_UID, threshold, studentIdHash, university);

    // Generate a real proof for cgpa=750, threshold=700 (valid: 750 >= 700)
    const realProof = await generateProof(750, threshold, STUDENT_ID, poseidon);

    // First call — should succeed
    await resumeRegistry.connect(employer).verifyCredential(
      realProof.pA, realProof.pB, realProof.pC, realProof.pubSignals, REUSED_UID, sig
    );

    // Second call with same UID — should revert
    await expect(
      resumeRegistry.connect(employer).verifyCredential(
        realProof.pA, realProof.pB, realProof.pC, realProof.pubSignals, REUSED_UID, sig
      )
    ).to.be.revertedWithCustomError(resumeRegistry, "AttestationAlreadyUsed");
  });

  // ─────────────────────────────────────────────────────────────────
  // Test 3: Unregistered university signature → FAIL
  // ─────────────────────────────────────────────────────────────────
  it("Test 3: Unknown university signer → reverts with UniversityNotRegistered ✓", async function () {
    const uid = ethers.hexlify(ethers.randomBytes(32));
    const threshold = 800;
    const hashResult = poseidon([STUDENT_ID]);
    const studentIdHash = poseidon.F.toObject(hashResult);

    // Sign with a non-registered account (student signs instead of university)
    const fakeSig = await createEASSignature(uid, threshold, studentIdHash, student);

    const dummyProof = {
      pA: [0n, 0n] as [bigint, bigint],
      pB: [[0n, 0n], [0n, 0n]] as [[bigint, bigint], [bigint, bigint]],
      pC: [0n, 0n] as [bigint, bigint],
      // [qualified=1, threshold, studentIdHash] — matches uint[3] interface
      pubSignals: [1n, BigInt(threshold), BigInt(studentIdHash)] as [bigint, bigint, bigint],
    };

    await expect(
      resumeRegistry.connect(student).verifyCredential(
        dummyProof.pA, dummyProof.pB, dummyProof.pC, dummyProof.pubSignals, uid, fakeSig
      )
    ).to.be.revertedWithCustomError(resumeRegistry, "UniversityNotRegistered");
  });

  // ─────────────────────────────────────────────────────────────────
  // Test 4: checkQualification with higher threshold → returns false
  // ─────────────────────────────────────────────────────────────────
  it("Test 4: Holder with threshold 800 does NOT meet employer's 900 requirement ✓", async function () {
    const [qualified] = await resumeRegistry.checkQualification(
      student.address,
      900 // employer wants 9.0 minimum
    );
    expect(qualified).to.be.false;
  });

  // ─────────────────────────────────────────────────────────────────
  // Test 5: totalVerifications counter
  // ─────────────────────────────────────────────────────────────────
  it("Test 5: Total verifications counter increments correctly ✓", async function () {
    const total = await resumeRegistry.totalVerifications();
    expect(total).to.be.greaterThan(0n);
    console.log(`  Total verifications on-chain: ${total}`);
  });
});
