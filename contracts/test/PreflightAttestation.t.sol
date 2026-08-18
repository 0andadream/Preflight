// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PreflightAttestation} from "../src/PreflightAttestation.sol";

contract PreflightAttestationTest is Test {
    PreflightAttestation internal att;

    function setUp() public {
        att = new PreflightAttestation();
    }

    function testAttestStoresAndEmits() public {
        bytes32 hash = keccak256("pdr");
        bytes32 agent = keccak256("Demo Treasury Agent");

        vm.expectEmit(true, true, false, true);
        emit PreflightAttestation.Attested(hash, address(this), agent, 2, 38, uint64(block.timestamp));

        att.attest(hash, 2, 38, agent);

        PreflightAttestation.Record memory rec = att.get(hash);
        assertEq(rec.policyHash, hash);
        assertEq(rec.decision, 2);
        assertEq(rec.score, 38);
        assertEq(rec.attester, address(this));
        assertEq(rec.agentId, agent);
        assertEq(rec.timestamp, uint64(block.timestamp));
    }

    function testRejectsBadDecision() public {
        vm.expectRevert("invalid decision");
        att.attest(bytes32(uint256(1)), 3, 10, bytes32(0));
    }

    function testRejectsBadScore() public {
        vm.expectRevert("invalid score");
        att.attest(bytes32(uint256(1)), 0, 101, bytes32(0));
    }
}
