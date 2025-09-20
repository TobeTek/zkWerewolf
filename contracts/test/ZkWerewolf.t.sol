// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import 'forge-std/Test.sol';
import '../src/ZkWerewolf.sol';

contract ZkWerewolfTest is Test {
	ZkWerewolf public zkGame;

	// Test accounts
	address admin = address(0xABCD);
	address player1 = address(0x1001);
	address player2 = address(0x1002);
	address player3 = address(0x1003);

	// Sample data (placeholders)
	bytes32 userAddressesHash =
		keccak256(abi.encodePacked(player1, player2, player3));
	bytes32[] userRoleCommitments;
	bytes32 moveCommitment1 = keccak256(abi.encodePacked('move1'));
	bytes32 moveCommitment2 = keccak256(abi.encodePacked('move2'));
	bytes32 moveCommitment3 = keccak256(abi.encodePacked('move3'));

	function setUp() public {
		zkGame = new ZkWerewolf();

		// Prepare userRoleCommitments equal to players count
		userRoleCommitments.push(
			keccak256(abi.encodePacked(player1, uint8(1), uint256(123)))
		); // e.g. werewolf role proof
		userRoleCommitments.push(
			keccak256(abi.encodePacked(player2, uint8(0), uint256(456)))
		);
		userRoleCommitments.push(
			keccak256(abi.encodePacked(player3, uint8(0), uint256(789)))
		);
	}

	function testCreateGame() public {
		vm.prank(admin);
		address[] memory players;
		players[0] = player1;
		players[1] = player2;
		players[2] = player3;

		uint256 gameId = zkGame.createGame(
			userAddressesHash,
			players,
			1,
			userRoleCommitments
		);

		assertTrue(gameId > 0, 'Game ID should be set');
		assertEq(zkGame.getNumPlayers(gameId), 3);
		assertEq(zkGame.getNumWerewolves(gameId), 1);
		assertEq(zkGame.getUserAddressesHash(gameId), userAddressesHash);
		assertTrue(zkGame.isPlayerInGame(gameId, player1));
	}

	function testPlayerCommitMove() public {
		// Use testCreateGame to set up (or hardcode gameId)
		vm.prank(admin);
		address[] memory players;
		players[0] = player1;
		players[1] = player2;
		players[2] = player3;

		uint256 gameId = zkGame.createGame(
			userAddressesHash,
			players,
			1,
			userRoleCommitments
		);

		vm.startPrank(player1);
		zkGame.commitMove(gameId, moveCommitment1);
		vm.stopPrank();

		bytes32 storedMove = zkGame.getMoveCommitment(gameId, player1);
		assertEq(storedMove, moveCommitment1);

		vm.prank(player2);
		zkGame.commitMove(gameId, moveCommitment2);

		// Player 2 can't submit twice
		vm.prank(player2);
		vm.expectRevert('Already submitted move this turn');
		zkGame.commitMove(gameId, moveCommitment2);
	}

	function testEndTurn() public {
		vm.prank(admin);
		address[] memory players;
		players[0] = player1;
		players[1] = player2;
		players[2] = player3;
		uint256 gameId = zkGame.createGame(
			userAddressesHash,
			players,
			1,
			userRoleCommitments
		);

		vm.prank(player1);
		zkGame.commitMove(gameId, moveCommitment1);
		vm.prank(player2);
		zkGame.commitMove(gameId, moveCommitment2);

		// Warp time to after turn duration
		vm.warp(block.timestamp + 4 minutes);

		vm.prank(admin);
		zkGame.endTurn(gameId, new bytes32[](0), '0x');

		// Test turn increment
		// Assume turnNumber getter added
		// uint lastTurn = zkGame.turnNumber();
		// assertEq(lastTurn, 2);
	}

	function testStartNextTurn() public {
		vm.prank(admin);
		address[] memory players;
		players[0] = player1;
		players[1] = player2;
		players[2] = player3;
		uint256 gameId = zkGame.createGame(
			userAddressesHash,
			players,
			1,
			userRoleCommitments
		);

		// Warp time so next turn allowed
		vm.warp(block.timestamp + 4 minutes);

		vm.prank(player1);
		zkGame.startNextTurn(gameId);

		// No revert means success
	}
}
