import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * scripts/transfer-admin.ts
 * Transfere admin and manager roles to a Multisig / DAO address.
 * 
 * Usage:
 *   export MULTISIG_ADDRESS=0x...
 *   npx hardhat run scripts/transfer-admin.ts --network sepolia [--dry-run]
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const targetMultisig = process.env.MULTISIG_ADDRESS;
  const isDryRun = process.argv.includes("--dry-run");

  if (!targetMultisig) {
    console.error("❌ Error: MULTISIG_ADDRESS environment variable is not set.");
    process.exit(1);
  }

  const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Error: deployments/sepolia.json not found.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const registryAddr = deployment.contracts.ResumeRegistry.address;

  console.log("════════════════════════════════════════════");
  console.log("  ZK Resume Protocol — ROLE HANDOVER");
  console.log("════════════════════════════════════════════");
  console.log(`  Registry  : ${registryAddr}`);
  console.log(`  From      : ${deployer.address}`);
  console.log(`  To (Safe) : ${targetMultisig}`);
  console.log(`  Mode      : ${isDryRun ? "DRY RUN (No changes)" : "LIVE EXECUTION"}`);
  console.log("────────────────────────────────────────────");

  const registry = await ethers.getContractAt("ResumeRegistry", registryAddr);
  
  const ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();
  const MANAGER_ROLE = await registry.UNIVERSITY_MANAGER_ROLE();

  if (isDryRun) {
    console.log("\n[DRY RUN] Actions to perform:");
    console.log(`  1. Grant DEFAULT_ADMIN_ROLE to ${targetMultisig}`);
    console.log(`  2. Grant UNIVERSITY_MANAGER_ROLE to ${targetMultisig}`);
    console.log(`  3. Renounce DEFAULT_ADMIN_ROLE from ${deployer.address}`);
    console.log(`  4. Renounce UNIVERSITY_MANAGER_ROLE from ${deployer.address}`);
    console.log("\n✓ Dry run complete. No gas spent.");
    return;
  }

  console.log("\n[1/4] Granting ADMIN_ROLE to Multisig...");
  const tx1 = await registry.grantRole(ADMIN_ROLE, targetMultisig);
  await tx1.wait();
  console.log("  ✓ Granted.");

  console.log("[2/4] Granting UNIVERSITY_MANAGER_ROLE to Multisig...");
  const tx2 = await registry.grantRole(MANAGER_ROLE, targetMultisig);
  await tx2.wait();
  console.log("  ✓ Granted.");

  console.log("[3/4] Renouncing UNIVERSITY_MANAGER_ROLE from deployer...");
  const tx3 = await registry.renounceRole(MANAGER_ROLE, deployer.address);
  await tx3.wait();
  console.log("  ✓ Renounced.");

  console.log("[4/4] Renouncing DEFAULT_ADMIN_ROLE from deployer...");
  console.log("  ⚠️  WARNING: You will lose control after this step.");
  const tx4 = await registry.renounceRole(ADMIN_ROLE, deployer.address);
  await tx4.wait();
  console.log("  ✓ Renounced.");

  console.log("\n════════════════════════════════════════════");
  console.log("  Handover Complete. Check Etherscan.");
  console.log("════════════════════════════════════════════");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
