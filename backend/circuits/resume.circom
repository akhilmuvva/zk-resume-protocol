pragma circom 2.0.0;

// Import the GreaterEqThan comparator from circomlib
// ⚠️  Use GreaterEqThan — NOT GreaterThan. Critical distinction.
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

/*
 * ResumeProver Circuit
 * ─────────────────────────────────────────────────────
 * Proves: cgpa >= threshold
 * WITHOUT revealing the actual cgpa value.
 *
 * CGPA is scaled by 100 to avoid floating point:
 *   e.g., 8.50 GPA → 850
 *         7.00 GPA → 700
 *
 * Public inputs  : threshold, studentIdHash
 * Private inputs : cgpa, studentId (bytes32 as field)
 *
 * Public outputs : qualified (1 = yes, 0 = no)
 */
template ResumeProver() {
    // ── Private Inputs (kept secret, never on-chain) ──────────────
    signal input cgpa;          // Actual CGPA × 100  (e.g. 850)
    signal input studentId;     // Student's bytes32 ID as field element

    // ── Public Inputs (verifier sees these) ───────────────────────
    signal input threshold;     // Minimum required CGPA × 100 (e.g. 800)
    signal input studentIdHash; // Poseidon hash of studentId (verified on-chain)

    // ── Output ────────────────────────────────────────────────────
    signal output qualified;    // 1 if cgpa >= threshold, else proof fails

    // ── Constraint 1: Verify studentId matches its public hash ────
    // This binds the private studentId to the on-chain attestation
    // without revealing the raw ID.
    component hasher = Poseidon(1);
    hasher.inputs[0] <== studentId;
    hasher.out === studentIdHash;

    // ── Constraint 2: Prove cgpa >= threshold ─────────────────────
    // GreaterEqThan(n) uses n bits. 32 bits covers 0 to ~4.2B,
    // which safely holds CGPA values (0 to 1000 range).
    component gte = GreaterEqThan(32);
    gte.in[0] <== cgpa;
    gte.in[1] <== threshold;

    // Assign the result
    qualified <== gte.out;

    // ── Hard constraint: proof only valid if qualified ─────────────
    // This makes it IMPOSSIBLE to generate a valid proof for
    // a CGPA below the threshold — no exceptions.
    qualified === 1;

    // ── Range check: prevent cgpa overflow attacks ─────────────────
    // Ensures cgpa is in valid range [0, 1000]
    component cgpaRange = LessEqThan(32);
    cgpaRange.in[0] <== cgpa;
    cgpaRange.in[1] <== 1000;
    cgpaRange.out === 1;
}

// Public signals: threshold and studentIdHash are visible to verifier
// cgpa and studentId remain private
component main {public [threshold, studentIdHash]} = ResumeProver();
