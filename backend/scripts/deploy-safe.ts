import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MockSafe with account:", deployer.address);

  const MockSafe = await ethers.getContractFactory("MockSafe");
  const safe = await MockSafe.deploy(deployer.address);
  await safe.waitForDeployment();

  const safeAddress = await safe.getAddress();
  console.log("MockSafe deployed to:", safeAddress);

  // Update deployment record
  const deploymentPath = path.join(__dirname, "..", "deployments", "sepolia.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  deployment.governance = {
    safe: safeAddress,
    owner: deployer.address
  };
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
