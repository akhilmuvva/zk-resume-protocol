import { ethers } from "hardhat";
import { SchemaRegistry } from "@ethereum-attestation-service/eas-sdk";

async function main() {
  const SCHEMA_UID = "0xb210f20f1cf0ae5165fe814869e6a237edf2bfc8ac0eb23848f483c6d95b6786";
  const SCHEMA_REGISTRY_ADDRESS = "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0"; // Sepolia Schema Registry

  console.log("════════════════════════════════════════════");
  console.log("  EAS Schema Immutability Verification");
  console.log("════════════════════════════════════════════");
  console.log(`  UID: ${SCHEMA_UID}`);

  const provider = ethers.provider;
  const schemaRegistry = new SchemaRegistry(SCHEMA_REGISTRY_ADDRESS);
  schemaRegistry.connect(provider as any);

  try {
    const schemaRecord = await schemaRegistry.getSchema({ uid: SCHEMA_UID });

    console.log(`\n  [Result]`);
    console.log(`  Schema   : ${schemaRecord.schema}`);
    console.log(`  Resolver : ${schemaRecord.resolver}`);
    console.log(`  Revocable: ${schemaRecord.revocable}`);

    let isHardened = true;

    // Hardening check 1: No resolver (prevents external logic from blocking/altering)
    if (schemaRecord.resolver !== ethers.ZeroAddress) {
      console.log("  [!] WARNING: Schema has a resolver. This allows external logic to intervene.");
      isHardened = false;
    } else {
      console.log("  ✓ No resolver detected (Good).");
    }

    // Hardening check 2: Revocability
    // In some ZK contexts, non-revocable is preferred for absolute permanence.
    // However, for university degrees, revocability is often required for fraud prevention.
    // The requirement specified "assert it is non-revocable".
    if (schemaRecord.revocable) {
      console.log("  [!] WARNING: Schema is revocable. Production hardening recommended non-revocable.");
      isHardened = false;
    } else {
      console.log("  ✓ Schema is non-revocable (Good).");
    }

    if (isHardened) {
      console.log("\n  ✅ SUCCESS: Schema meets production-hardening standards.");
    } else {
      console.log("\n  ❌ FAILURE: Schema does not meet all hardening criteria.");
      process.exit(1);
    }

  } catch (error) {
    console.error("\n  [Error] Failed to fetch schema:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
