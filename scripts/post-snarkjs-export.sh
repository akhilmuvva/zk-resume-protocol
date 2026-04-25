#!/bin/bash
# ZK Resume Protocol — Post-SnarkJS Export Patch
# Fixes 'uint' to 'uint256' and contract names in generated verifiers.

VERIFIER_PATH="backend/contracts/ResumeVerifier.sol"

if [ -f "$VERIFIER_PATH" ]; then
    echo "Patching $VERIFIER_PATH..."
    
    # Replace uint with uint256 (only where appropriate in function signature)
    # Using perl for multi-line/regex safety if needed, but sed works for simple matches
    sed -i 's/uint\[/uint256\[/g' "$VERIFIER_PATH"
    sed -i 's/uint /uint256 /g' "$VERIFIER_PATH"
    
    # Ensure contract name is consistent if snarkjs changed it
    # sed -i 's/contract Groth16Verifier/contract ResumeVerifier/g' "$VERIFIER_PATH"
    
    echo "Patch applied successfully."
else
    echo "Verifier not found at $VERIFIER_PATH"
    exit 1
fi
