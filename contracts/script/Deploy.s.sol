// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "forge-std/Script.sol";
import "../src/ZkWerewolf.sol";

contract DeployZkWerewolf is Script {
    function run() external {
        vm.startBroadcast();

        ZkWerewolf zkGame = new ZkWerewolf();

        vm.stopBroadcast();
    }
}
