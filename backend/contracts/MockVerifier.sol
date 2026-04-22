// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IResumeVerifier.sol";

/**
 * @title MockVerifier
 * @notice Test-only verifier that always returns true.
 *         Used in tests when Circom circuit artifacts are not compiled.
 *         NEVER deploy this to mainnet.
 */
contract MockVerifier is IResumeVerifier {
    function verifyProof(
        uint[2] calldata,
        uint[2][2] calldata,
        uint[2] calldata,
        uint[3] calldata
    ) external pure override returns (bool) {
        return true; // Always valid — FOR TESTING ONLY
    }
}
