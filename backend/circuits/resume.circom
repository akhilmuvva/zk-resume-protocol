pragma circom 2.0.0;

// Import the GreaterEqThan comparator from circomlib
// ⚠️  Use GreaterEqThan — NOT GreaterThan. Critical distinction.
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

/*
 * ResumeProver
 * Proves cgpa >= threshold without leaking the grade.
 * gpa is scaled by 100 (8.50 -> 850).
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

    // check id matches hash
    component hasher = Poseidon(1);
    hasher.inputs[0] <== studentId;
    hasher.out === studentIdHash;

    // prove cgpa >= threshold
    component gte = GreaterEqThan(32);
    gte.in[0] <== cgpa;
    gte.in[1] <== threshold;

    // Assign the result
    qualified <== gte.out;

    // must be qualified
    qualified === 1;

    // range checks [0, 1000]
    component cgpaRange = LessEqThan(32);
    cgpaRange.in[0] <== cgpa;
    cgpaRange.in[1] <== 1000;
    cgpaRange.out === 1;

    component thresholdRange = LessEqThan(32);
    thresholdRange.in[0] <== threshold;
    thresholdRange.in[1] <== 1000;
    thresholdRange.out === 1;
}

// Public signals: threshold and studentIdHash are visible to verifier
// cgpa and studentId remain private
component main {public [threshold, studentIdHash]} = ResumeProver();
