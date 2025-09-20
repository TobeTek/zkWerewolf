// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract ZkWerewolf {
	struct Game {
		address admin;
		bytes32 userAddressesHash;
		uint256 numPlayers;
		uint256 numWerewolves;
		bytes32[] userRoleCommitments; // commitment per player (hash of address, role, secret)
		mapping(address => bool) inGame;
		mapping(address => bytes32) moveCommitments; // current turn commitments
		uint256 turnNumber;
		uint256 lastTurnTimestamp;
		bool active;
		bytes32[] currentMoveCommitments; // all move commitments for turn
	}

	// Game ID => Game data
	mapping(uint256 => Game) games;
	uint256 public nextGameId = 1;

	uint256 public constant TURN_DURATION = 3 minutes;

	event GameCreated(
		uint256 indexed gameId,
		address indexed admin,
		bytes32 userAddressesHash,
		uint256 numPlayers,
		uint256 numWerewolves,
		bytes32[] userRoleCommitments
	);

	event MoveCommitted(
		uint256 indexed gameId,
		address indexed player,
		bytes32 commitment
	);
	event TurnEnded(
		uint256 indexed gameId,
		uint256 turnNumber,
		bytes32[] commitments
	);
	event NextTurnStarted(uint256 indexed gameId, uint256 turnNumber);

	modifier onlyGameAdmin(uint256 gameId) {
		require(games[gameId].admin == msg.sender, 'Not game admin');
		_;
	}

	modifier onlyInGame(uint256 gameId) {
		require(games[gameId].inGame[msg.sender], 'Not player in game');
		_;
	}

	modifier gameActive(uint256 gameId) {
		require(games[gameId].active, 'Game not active');
		_;
	}

	// Create a game, called by whoever is admin for this game
	function createGame(
		bytes32 userAddressesHash,
		address[] calldata players,
		uint256 numWerewolves,
		bytes32[] calldata userRoleCommitments
	) external returns (uint256) {
		require(
			players.length == userRoleCommitments.length,
			'Players and commitments count mismatch'
		);
		require(
			numWerewolves > 0 && numWerewolves < players.length,
			'Invalid werewolf count'
		);

		uint256 gameId = nextGameId++;
		Game storage g = games[gameId];

		g.admin = msg.sender;
		g.userAddressesHash = userAddressesHash;
		g.numPlayers = players.length;
		g.numWerewolves = numWerewolves;
		g.active = true;
		g.turnNumber = 1;
		g.lastTurnTimestamp = block.timestamp;
		g.userRoleCommitments = userRoleCommitments;

		for (uint i = 0; i < players.length; i++) {
			g.inGame[players[i]] = true;
		}

		emit GameCreated(
			gameId,
			msg.sender,
			userAddressesHash,
			players.length,
			numWerewolves,
			userRoleCommitments
		);

		return gameId;
	}

	// Player submits a move commitment (hash of their target + random secret)
	function commitMove(
		uint256 gameId,
		bytes32 moveCommitment
	) external gameActive(gameId) onlyInGame(gameId) {
		Game storage g = games[gameId];

		require(
			g.moveCommitments[msg.sender] == 0,
			'Already submitted move this turn'
		);
		g.moveCommitments[msg.sender] = moveCommitment;
		g.currentMoveCommitments.push(moveCommitment);
		emit MoveCommitted(gameId, msg.sender, moveCommitment);
	}

	// End the current turn, can only be called by admin
	// Admin submits proof of correct moves (off-chain verified or via verifier)
	function endTurn(
		uint256 gameId,
		bytes32[] calldata commitments,
		bytes calldata proof
	) external onlyGameAdmin(gameId) gameActive(gameId) {
		Game storage g = games[gameId];

		require(
			block.timestamp >= g.lastTurnTimestamp + TURN_DURATION,
			'Turn time not elapsed'
		);
		require(
			commitments.length == g.numPlayers,
			'Commitments count mismatch'
		);

		// TODO: Call zk proof verifier with `proof` and `commitments`
		// require(verifyProof(proof, commitments), "Invalid proof");
		// For now, assume success

		emit TurnEnded(gameId, g.turnNumber, commitments);

		// Clear moves for next turn
		for (uint i = 0; i < g.numPlayers; i++) {
			// We must reset each player's move commitment
			// For gas optimization, you may want a different data structure
			// This loops with player addresses unknown, consider offchain index or events
		}
		// Clear map by redeploy or tweak contract design if gas expensive
		for (uint i = 0; i < g.currentMoveCommitments.length; i++) {
			// no-op, just cleaning dynamic array below
		}
		delete g.currentMoveCommitments;

		g.turnNumber++;
		g.active = true;
		g.lastTurnTimestamp = block.timestamp;
	}

	// Any player can start next turn if time elapsed and previous turn ended
	function startNextTurn(
		uint256 gameId
	) external gameActive(gameId) onlyInGame(gameId) {
		Game storage g = games[gameId];
		require(!turnActive(g), 'Turn already active');
		require(
			block.timestamp >= g.lastTurnTimestamp + TURN_DURATION,
			'Too soon to start next turn'
		);

		g.lastTurnTimestamp = block.timestamp;
		g.active = true;

		emit NextTurnStarted(gameId, g.turnNumber);
	}

	function turnActive(Game storage g) internal view returns (bool) {
		// You can implement additional logic here, e.g., track turn status explicitly
		return true; // stub: you must improve this with real state machine
	}

	// Auxiliary View Functions

	function getUserRoleCommitments(
		uint256 gameId
	) external view returns (bytes32[] memory) {
		return games[gameId].userRoleCommitments;
	}

	function getCurrentMoveCommitments(
		uint256 gameId
	) external view returns (bytes32[] memory) {
		return games[gameId].currentMoveCommitments;
	}

	function isPlayerInGame(
		uint256 gameId,
		address player
	) external view returns (bool) {
		return games[gameId].inGame[player];
	}

	function getUserAddressesHash(
		uint256 gameId
	) external view returns (bytes32) {
		return games[gameId].userAddressesHash;
	}

	function getNumPlayers(uint256 gameId) external view returns (uint256) {
		return games[gameId].numPlayers;
	}

	function getNumWerewolves(uint256 gameId) external view returns (uint256) {
		return games[gameId].numWerewolves;
	}

	function getUserRoleCommitment(
		uint256 gameId,
		uint256 index
	) external view returns (bytes32) {
		return games[gameId].userRoleCommitments[index];
	}

	function getMoveCommitment(
		uint256 gameId,
		address player
	) external view returns (bytes32) {
		return games[gameId].moveCommitments[player];
	}
}
