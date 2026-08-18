// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PreflightAttestation} from "../src/PreflightAttestation.sol";
import {PreflightFirewall} from "../src/PreflightFirewall.sol";

contract DeployFirewall is Script {
    function run() external {
        address book = vm.envAddress("ATTESTATION");
        vm.startBroadcast();
        PreflightFirewall wall = new PreflightFirewall(PreflightAttestation(book));
        wall.setAgent(msg.sender, true);
        console.log("PreflightFirewall", address(wall));
        vm.stopBroadcast();
    }
}
