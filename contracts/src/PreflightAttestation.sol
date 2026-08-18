// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PreflightAttestation
/// @notice Minimal X Layer record of a deterministic Policy Decision Record hash.
///         AI never writes this. Only the already-decided hash, decision, and score.
contract PreflightAttestation {
    uint8 public constant DECISION_ALLOW = 0;
    uint8 public constant DECISION_WARN = 1;
    uint8 public constant DECISION_BLOCK = 2;

    struct Record {
        bytes32 policyHash;
        uint8 decision;
        uint8 score;
        uint64 timestamp;
        address attester;
        bytes32 agentId;
    }

    mapping(bytes32 => Record) public records;

    event Attested(
        bytes32 indexed policyHash,
        address indexed attester,
        bytes32 agentId,
        uint8 decision,
        uint8 score,
        uint64 timestamp
    );

    function attest(bytes32 policyHash, uint8 decision, uint8 score, bytes32 agentId) external {
        require(decision <= DECISION_BLOCK, "invalid decision");
        require(score <= 100, "invalid score");

        Record memory rec = Record({
            policyHash: policyHash,
            decision: decision,
            score: score,
            timestamp: uint64(block.timestamp),
            attester: msg.sender,
            agentId: agentId
        });

        records[policyHash] = rec;
        emit Attested(policyHash, msg.sender, agentId, decision, score, rec.timestamp);
    }

    function get(bytes32 policyHash) external view returns (Record memory) {
        return records[policyHash];
    }
}
