import { ethers, artifacts } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Mainnet-Ready Sepolia Deployment Script
 * Includes:
 * - Bytecode size validation (EIP-170)
 * - Constructor argument logging
 * - Deployment artifact saving
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;

  console.log("════════════════════════════════════════════");
  console.log("  ZK Resume Protocol — PRODUCTION DEPLOY");
  console.log("════════════════════════════════════════════");
  console.log(`  Network   : ${networkName}`);
  console.log(`  Deployer  : ${deployer.address}`);
  console.log("────────────────────────────────────────────");

  // ── Pre-flight: Bytecode Size Checks ───────────────────────────
  console.log("\n[0/3] Checking contract sizes...");
  
  const contractsToCheck = ["Groth16Verifier", "ResumeRegistry"];
  for (const name of contractsToCheck) {
    const artifact = await artifacts.readArtifact(name);
    const size = (artifact.deployedBytecode.length - 2) / 2;
    console.log(`  - ${name.padEnd(16)} : ${size} bytes`);
    if (size > 24576) {
      console.error(`  ❌ ERROR: ${name} is over the 24KB limit!`);
      process.exit(1);
    }
  }
  console.log("  ✓ All contracts within limits.");

  // ── Step 1: Deploy Verifier ────────────────────────────────────
  console.log("\n[1/3] Deploying ResumeVerifier...");
  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log(`  ✓ Verifier deployed at: ${verifierAddress}`);

  // ── Step 2: Deploy Registry ────────────────────────────────────
  console.log("\n[2/3] Deploying ResumeRegistry...");
  const Registry = await ethers.getContractFactory("ResumeRegistry");
  const registry = await Registry.deploy(verifierAddress);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`  ✓ Registry deployed at: ${registryAddress}`);

  // ── Save Artifacts ─────────────────────────────────────────────
  const deploymentData = {
    network: networkName,
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ResumeVerifier: verifierAddress,
      ResumeRegistry: registryAddress,
    }
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);
  
  fs.writeFileSync(
    path.join(deploymentsDir, `${networkName}.json`),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\n════════════════════════════════════════════");
  console.log("  Deployment Finished Successfully");
  console.log("════════════════════════════════════════════");
  console.log(`  Saved to: deployments/${networkName}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
