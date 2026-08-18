// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PreflightAttestation} from "../src/PreflightAttestation.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        PreflightAttestation att = new PreflightAttestation();
        console.log("PreflightAttestation", address(att));
        vm.stopBroadcast();
    }
}
