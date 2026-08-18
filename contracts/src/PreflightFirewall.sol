// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PreflightAttestation} from "./PreflightAttestation.sol";

/// @notice Agents that execute through this contract cannot spend unless
///         Preflight has already written an ALLOW attestation.
contract PreflightFirewall {
    PreflightAttestation public immutable book;
    address public owner;
    mapping(address => bool) public agents;

    event AgentSet(address indexed agent, bool allowed);
    event Executed(address indexed agent, address indexed target, bytes32 policyHash);

    constructor(PreflightAttestation _book) {
        book = _book;
        owner = msg.sender;
    }

    function setAgent(address agent, bool allowed) external {
        require(msg.sender == owner, "not owner");
        agents[agent] = allowed;
        emit AgentSet(agent, allowed);
    }

    function execute(address target, uint256 value, bytes calldata data, bytes32 policyHash) external payable {
        require(agents[msg.sender], "not a registered agent");
        PreflightAttestation.Record memory rec = book.get(policyHash);
        require(rec.policyHash == policyHash, "missing attestation");
        require(rec.decision == book.DECISION_ALLOW(), "not ALLOW");

        (bool ok, bytes memory err) = target.call{value: value}(data);
        require(ok, string(err));
        emit Executed(msg.sender, target, policyHash);
    }
}
