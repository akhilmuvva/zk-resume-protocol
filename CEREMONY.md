# ZK Resume Protocol — Trusted Setup (Ceremony)

## 1. Introduction
This protocol uses Groth16, which requires a "trusted setup" (Powers of Tau) to generate parameters (`.zkey`) for proving and verifying. This document describes the hardened ceremony process.

## 2. Hardened Entropy Pattern
To ensure the integrity of the ceremony, `scripts/ceremony.js` uses cryptographically secure entropy:
- **Node.js**: `crypto.randomBytes(32).toString('hex')`.
- **Validation**: Scripts verify the Node.js version (v18+) to ensure API availability.

## 3. Ceremony Steps

### Phase 1: Powers of Tau
1.  **Initialize**: `snarkjs powersoftau new bn128 12 pot12_0000.ptau`.
2.  **Contribute**: Multiple rounds of entropy contributions.
3.  **Beacon**: Finalize with a public random beacon (e.g., a future Bitcoin block hash).
4.  **Prepare Phase 2**: `snarkjs powersoftau prepare phase2 pot12_final.ptau`.

### Phase 2: Circuit Specific Setup
1.  **Setup**: `snarkjs groth16 setup resume.r1cs pot12_final.ptau resume_0000.zkey`.
2.  **Contribute**: Add circuit-specific entropy.
3.  **Export Verification Key**: `snarkjs zkey export verificationkey resume_final.zkey verification_key.json`.

## 4. Production Requirements
- **Artifact Removal**: All intermediate `.ptau` and `.zkey` files MUST be deleted before mainnet deployment.
- **Verification Key**: Only `verification_key.json` and `resume_final.zkey` (or their content in code) should be distributed to the frontend.
- **Contract Export**: `snarkjs zkey export solidityverifier` generates the `Groth16Verifier.sol`.
