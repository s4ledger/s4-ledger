// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SolusAnchor {
    event RecordAnchored(bytes32 indexed hash, address indexed sender, uint256 timestamp);

    function anchorRecord(bytes32 hash) public {
        emit RecordAnchored(hash, msg.sender, block.timestamp);
    }
}
