/**
 * register-schema.ts
 * ──────────────────────────────────────────────────────────────────
 * Registers the ZK Resume EAS schema on Sepolia using the backend
 * deployer wallet. No browser / MetaMask needed.
 *
 * Run: npx ts-node scripts/register-schema.ts
 * ──────────────────────────────────────────────────────────────────
 */

import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

// ── EAS Sepolia addresses (official, permanent) ──────────────────
const EAS_SCHEMA_REGISTRY = "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0";

const SCHEMA_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: "string",  name: "schema",   type: "string"  },
      { internalType: "address", name: "resolver",  type: "address" },
      { internalType: "bool",    name: "revocable", type: "bool"    },
    ],
    name: "register",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const SCHEMA_STRING = "bytes32 studentId,uint256 cgpa,string degree";
const RESOLVER      = ethers.ZeroAddress;   // no resolver
const REVOCABLE     = true;

async function main() {
  const rpcUrl    = process.env.SEPOLIA_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("Missing SEPOLIA_URL or PRIVATE_KEY in .env");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet   = new ethers.Wallet(privateKey, provider);

  console.log("🔑 Deployer address:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error(
      "Deployer wallet has 0 ETH on Sepolia.\n" +
      "Fund it from: https://sepoliafaucet.com  (Alchemy account)\n" +
      `Wallet: ${wallet.address}`
    );
  }

  const registry = new ethers.Contract(
    EAS_SCHEMA_REGISTRY,
    SCHEMA_REGISTRY_ABI,
    wallet
  );

  console.log("\n📋 Registering schema:", SCHEMA_STRING);
  console.log("   Resolver: none (zero address)");
  console.log("   Revocable:", REVOCABLE);

  const tx = await registry.register(SCHEMA_STRING, RESOLVER, REVOCABLE);
  console.log("\n⏳ Transaction sent:", tx.hash);
  console.log("   Waiting for confirmation...");

  const receipt = await tx.wait();

  // The UID is emitted in the Registered event log
  // Topic[0] = event sig, Topic[1] = UID
  const schemaUID = receipt.logs[0]?.topics[1] ?? "check receipt manually";

  console.log("\n✅ Schema registered!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   Schema UID:", schemaUID);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📝 Next step — update frontend/.env.local:");
  console.log(`   NEXT_PUBLIC_SCHEMA_UID=${schemaUID}`);
  console.log("\n📝 Next step — update backend/.env:");
  console.log(`   SCHEMA_UID=${schemaUID}`);
  console.log(
    "\n🔍 Verify at: https://sepolia.easscan.org/schema/view/" + schemaUID
  );
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message ?? err);
  process.exit(1);
});
