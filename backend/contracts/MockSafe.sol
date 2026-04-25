// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockSafe
 * @dev A simple 1-of-1 Multisig mock for protocol governance testing.
 */
contract MockSafe is Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {}

    function execute(address target, uint256 value, bytes calldata data) external onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "MockSafe: execution failed");
        return result;
    }
}
