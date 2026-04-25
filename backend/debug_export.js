const snarkjs = require("snarkjs");
const path = require("path");
const fs = require("fs");

async function run() {
  const zkeyFinal = path.join(__dirname, "circuits", "build", "resume_final.zkey");
  console.log("Exporting verifier from:", zkeyFinal);
  try {
    const solidity = await snarkjs.zKey.exportSolidityVerifier(zkeyFinal);
    console.log("Success! Length:", solidity.length);
  } catch (err) {
    console.error("FAILED:", err);
    console.error(err.stack);
  }
}

run();
