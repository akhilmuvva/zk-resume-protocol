/**
 * ZK Resume Protocol — Full Trusted Setup Ceremony
 * ──────────────────────────────────────────────────────────────────
 * Uses snarkjs Node API (v0.7.x) — no global snarkjs CLI required.
 *
 * Outputs:
 *   circuits/build/resume_final.zkey
 *   circuits/build/verification_key.json
 *   contracts/ResumeVerifier.sol
 *   circuits/test/proof.json + public.json + calldata.txt
 *   frontend/public/circuits/  (wasm + zkey + vkey)
 */

const snarkjs   = require("snarkjs");
const { getCurveFromName } = require("ffjavascript");
const fs        = require("fs");
const path      = require("path");
const crypto    = require("crypto");

const ROOT          = path.join(__dirname, "..");
const BUILD         = path.join(ROOT, "circuits", "build");
const TEST_DIR      = path.join(ROOT, "circuits", "test");
const CONTRACTS_DIR = path.join(ROOT, "contracts");

const log     = (msg) => console.log(`  ${msg}`);
const ok      = (msg) => console.log(`  ✓ ${msg}`);
const section = (t)   => {
  console.log(`\n${"─".repeat(52)}`);
  console.log(`  ${t}`);
  console.log(`${"─".repeat(52)}`);
};

async function main() {
  console.log("═".repeat(52));
  console.log("  ZK Resume Protocol — Trusted Setup Ceremony");
  console.log("═".repeat(52));

  // ── Pre-flight: Node.js Check ──────────────────────────────────
  if (parseInt(process.versions.node.split(".")[0]) < 18) {
    console.error("❌ ERROR: Node.js v18+ is required for cryptographically secure ceremony.");
    process.exit(1);
  }

  const wasmPath = path.join(BUILD, "resume_js", "resume.wasm");
  const r1csPath = path.join(BUILD, "resume.r1cs");

  if (!fs.existsSync(wasmPath) || !fs.existsSync(r1csPath)) {
    console.error("❌ Missing circuit artifacts. Run circom first.");
    process.exit(1);
  }
  ok("Circuit artifacts: resume.wasm + resume.r1cs ✓");
  [BUILD, TEST_DIR, CONTRACTS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

  // ── Phase 1: Powers of Tau ──────────────────────────────────────
  section("TASK 2 — Powers of Tau (Phase 1)");

  const pot0     = path.join(BUILD, "pot12_0000.ptau");
  const pot1     = path.join(BUILD, "pot12_0001.ptau");
  const potFinal = path.join(BUILD, "pot12_final.ptau");

  log("Loading BN128 curve...");
  const curve = await getCurveFromName("bn128");

  log("2.1 newAccumulator (bn128, 2^12)...");
  await snarkjs.powersOfTau.newAccumulator(curve, 12, pot0);
  ok("pot12_0000.ptau created");

  log("2.2 Contributing (Phase 1)...");
  const phase1Entropy = crypto.randomBytes(32).toString("hex");
  await snarkjs.powersOfTau.contribute(
    pot0, pot1,
    "ZKResume Initial",
    phase1Entropy
  );
  ok("pot12_0001.ptau created (using secure random entropy)");

  log("2.3 Preparing Phase 2...");
  await snarkjs.powersOfTau.preparePhase2(pot1, potFinal);
  ok("pot12_final.ptau created");

  // ── Phase 2: Circuit-Specific ───────────────────────────────────
  section("TASK 2 — Phase 2 (Circuit-Specific)");

  const zkey0     = path.join(BUILD, "resume_0000.zkey");
  const zkeyFinal = path.join(BUILD, "resume_final.zkey");
  const vkeyPath  = path.join(BUILD, "verification_key.json");

  log("2.4 groth16 setup (R1CS + ptau → zkey0)...");
  await snarkjs.zKey.newZKey(r1csPath, potFinal, zkey0);
  ok("resume_0000.zkey created");

  log("2.5 Phase 2 contribution...");
  const phase2Entropy = crypto.randomBytes(32).toString("hex");
  await snarkjs.zKey.contribute(
    zkey0, zkeyFinal,
    "ZKResume Phase2",
    phase2Entropy
  );
  ok("resume_final.zkey created (using secure random entropy)");

  log("2.6 Exporting verification key...");
  const vkey = await snarkjs.zKey.exportVerificationKey(zkeyFinal);
  fs.writeFileSync(vkeyPath, JSON.stringify(vkey, null, 2));
  ok(`verification_key.json (protocol: ${vkey.protocol})`);

  await curve.terminate();

  // ── Task 3: Test Proof ──────────────────────────────────────────
  section("TASK 3 — Proof Generation & Verification");

  const { buildPoseidon } = require("circomlibjs");
  const poseidon = await buildPoseidon();
  const studentId = BigInt("0x72a56193c9f10000000000000000000000000000000000000000000000000001");
  const hashResult = poseidon([studentId]);
  const studentIdHash = poseidon.F.toObject(hashResult).toString();

  const input = { cgpa: 820, threshold: 750, studentId: studentId.toString(), studentIdHash };
  fs.writeFileSync(path.join(TEST_DIR, "input.json"), JSON.stringify(input, null, 2));
  log(`3.1 Input: cgpa=820, threshold=750`);

  log("3.2 Calculating witness...");
  const witnessPath = path.join(TEST_DIR, "witness.wtns");
  await snarkjs.wtns.calculate(input, wasmPath, witnessPath);
  ok("witness.wtns created");

  log("3.3 Generating Groth16 proof...");
  const { proof, publicSignals } = await snarkjs.groth16.prove(zkeyFinal, witnessPath);
  fs.writeFileSync(path.join(TEST_DIR, "proof.json"),  JSON.stringify(proof, null, 2));
  fs.writeFileSync(path.join(TEST_DIR, "public.json"), JSON.stringify(publicSignals, null, 2));
  ok("proof.json + public.json written");

  log("3.4 Verifying proof locally...");
  const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);
  if (!verified) { console.error("❌ PROOF VERIFICATION FAILED — STOP"); process.exit(1); }
  ok("Local verification → OK ✓");

  // ── 3e: Export Solidity Verifier ────────────────────────────────
  section("TASK 3e — Export Solidity Verifier");
  log("Exporting Groth16Verifier.sol (auto-generated)...");
  const templates = {
    groth16: fs.readFileSync(path.join(ROOT, "node_modules", "snarkjs", "templates", "verifier_groth16.sol.ejs"), "utf8"),
  };
  const solidity = await snarkjs.zKey.exportSolidityVerifier(zkeyFinal, templates);
  const verifierPath = path.join(CONTRACTS_DIR, "ResumeVerifier.sol");
  fs.writeFileSync(verifierPath, solidity);
  ok(`ResumeVerifier.sol written (${(solidity.length / 1024).toFixed(1)} KB)`);

  // Save calldata for manual testing
  const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  fs.writeFileSync(path.join(TEST_DIR, "calldata.txt"), calldata);
  ok("calldata.txt saved");

  // ── 3f: Copy to Frontend ────────────────────────────────────────
  section("TASK 3f — Copy Artifacts to Frontend");
  const FRONTEND_CIRCUITS = path.join(ROOT, "..", "frontend", "public", "circuits");
  fs.mkdirSync(FRONTEND_CIRCUITS, { recursive: true });

  for (const [src, name] of [
    [wasmPath, "resume.wasm"],
    [zkeyFinal, "resume_final.zkey"],
    [vkeyPath, "verification_key.json"],
  ]) {
    const dst = path.join(FRONTEND_CIRCUITS, name);
    fs.copyFileSync(src, dst);
    const kb = (fs.statSync(dst).size / 1024).toFixed(1);
    ok(`${name} (${kb} KB) → frontend/public/circuits/`);
  }

  // ── Final Summary ───────────────────────────────────────────────
  console.log("\n" + "═".repeat(52));
  console.log("  🎉 Ceremony Complete!");
  console.log("═".repeat(52));
  console.log(`
  Files generated:
  ✓ circuits/build/resume_final.zkey
  ✓ circuits/build/verification_key.json
  ✓ contracts/ResumeVerifier.sol
  ✓ circuits/test/proof.json
  ✓ circuits/test/public.json
  ✓ circuits/test/calldata.txt
  ✓ frontend/public/circuits/resume.wasm
  ✓ frontend/public/circuits/resume_final.zkey
  ✓ frontend/public/circuits/verification_key.json

  Next steps:
  1. npx hardhat compile     (picks up new ResumeVerifier.sol)
  2. npx hardhat test        (5/5 with real Groth16Verifier)
  3. Register EAS schema at https://sepolia.easscan.org/schema/create
  4. npx hardhat run scripts/deploy.ts --network sepolia
`);
}

main().catch(err => {
  console.error("\n❌ Ceremony failed:", err.message ?? err);
  console.error(err.stack);
  process.exit(1);
});
