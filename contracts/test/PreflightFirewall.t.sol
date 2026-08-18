// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PreflightAttestation} from "../src/PreflightAttestation.sol";
import {PreflightFirewall} from "../src/PreflightFirewall.sol";

contract PreflightFirewallTest is Test {
    PreflightAttestation internal book;
    PreflightFirewall internal wall;

    function setUp() public {
        book = new PreflightAttestation();
        wall = new PreflightFirewall(book);
        wall.setAgent(address(this), true);
    }

    function testExecuteRequiresAllow() public {
        bytes32 hash = keccak256("pdr");
        vm.expectRevert("missing attestation");
        wall.execute(address(0xBEEF), 0, "", hash);

        book.attest(hash, 2, 10, bytes32(0));
        vm.expectRevert("not ALLOW");
        wall.execute(address(0xBEEF), 0, "", hash);
    }

    function testExecuteSucceedsWithAllow() public {
        bytes32 hash = keccak256("ok");
        book.attest(hash, 0, 96, bytes32(0));
        wall.execute(address(this), 0, "", hash);
    }

    fallback() external payable {}
}
