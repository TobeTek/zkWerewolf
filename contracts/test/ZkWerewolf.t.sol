// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "forge-std/Test.sol";
import "../src/ZkWerewolf.sol";

contract ZkWerewolfTest is Test {
    ZkWerewolf public zkWerewolf;
    address[] public players;
    bytes32[] public userRoleCommitments;
    bytes public adminPublicKey;
    bytes32 public userAddressesHash;

    function setUp() public {
        zkWerewolf = new ZkWerewolf();
        players = new address[](4);
        players[0] = address(1);
        players[1] = address(2);
        players[2] = address(3);
        players[3] = address(4);
        userRoleCommitments = new bytes32[](4);
        userRoleCommitments[0] = bytes32(uint256(1));
        userRoleCommitments[1] = bytes32(uint256(2));
        userRoleCommitments[2] = bytes32(uint256(3));
        userRoleCommitments[3] = bytes32(uint256(4));
        adminPublicKey = abi.encodePacked("adminPublicKey");
        userAddressesHash = keccak256(abi.encodePacked(players));
    }

    function testCreateGame() public {
        uint256 gameId = zkWerewolf.createGame(adminPublicKey, userAddressesHash, players, 1, userRoleCommitments);
        assertEq(zkWerewolf.nextGameId(), 2);
        assertEq(zkWerewolf.getNumPlayers(gameId), 4);
        assertEq(zkWerewolf.getNumWerewolves(gameId), 1);
    }

    function testCommitMove() public {
        uint256 gameId = zkWerewolf.createGame(adminPublicKey, userAddressesHash, players, 1, userRoleCommitments);
        vm.prank(players[0]);
        bytes32 moveCommitment = bytes32(uint256(123));
        zkWerewolf.commitMove(gameId, moveCommitment);
        assertEq(zkWerewolf.getMoveCommitment(gameId, players[0]), moveCommitment);
    }

    function testStartVote() public {
        uint256 gameId = zkWerewolf.createGame(adminPublicKey, userAddressesHash, players, 1, userRoleCommitments);
        vm.prank(players[0]);
        zkWerewolf.startVote(gameId);
        assertTrue(zkWerewolf.isGameVoteActive(gameId));
    }

    function testCastVote() public {
        uint256 gameId = zkWerewolf.createGame(adminPublicKey, userAddressesHash, players, 1, userRoleCommitments);
        vm.prank(players[0]);
        zkWerewolf.startVote(gameId);
        vm.prank(players[1]);
        zkWerewolf.castVote(gameId, players[0]);
        assertEq(zkWerewolf.getVotesAgainstPlayer(gameId, players[0]), 1);
    }

    function testEndVote() public {
        uint256 gameId = zkWerewolf.createGame(adminPublicKey, userAddressesHash, players, 1, userRoleCommitments);
        vm.prank(players[0]);
        zkWerewolf.startVote(gameId);
        vm.prank(players[1]);
        zkWerewolf.castVote(gameId, players[0]);
        vm.prank(players[2]);
        zkWerewolf.castVote(gameId, players[0]);

        vm.warp(block.timestamp + 3 minutes + 1);
        vm.prank(address(this));

        zkWerewolf.endVote(gameId);
        assertFalse(zkWerewolf.isGameVoteActive(gameId));
        assertFalse(zkWerewolf.isPlayerInGame(gameId, players[0]));
    }
}
