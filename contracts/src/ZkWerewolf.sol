// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract ZkWerewolf {
    struct Game {
        address admin;
        bytes adminPublicKey;
        bytes32 userAddressesHash;
        uint256 numPlayers;
        uint256 numWerewolves;
        bytes32[] userRoleCommitments;
        mapping(address => bool) inGame;
        mapping(address => bytes32) moveCommitments;
        mapping(address => bool) hasInitiatedVote;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) votesAgainstPlayer;
        uint256 turnNumber;
        uint256 lastTurnTimestamp;
        bool gameOver;
        bool active;
        bool voteActive;
        uint256 voteStartTime;
        uint256 werewolvesDiscovered;
        uint256 villagersAlive;
        bytes32[] currentMoveCommitments;
        address[] players;
    }

    mapping(uint256 => Game) public games;
    uint256 public nextGameId = 1;
    uint256 public constant TURN_DURATION = 3 minutes;
    uint256 public constant VOTE_DURATION = 3 minutes;

    // --- Events ---
    event GameCreated(
        uint256 indexed gameId,
        address indexed admin,
        bytes adminPublicKey,
        bytes32 userAddressesHash,
        uint256 numPlayers,
        uint256 numWerewolves,
        bytes32[] userRoleCommitments
    );
    event PlayerAddedToGame(uint256 indexed gameId, address indexed admin, address indexed player);
    event MoveCommitted(uint256 indexed gameId, address indexed player, bytes32 commitment);
    event TurnEnded(uint256 indexed gameId, uint256 turnNumber, bytes32[] commitments);
    event PlayerKilled(uint256 indexed gameId, address indexed player);
    event PlayerVotedOut(uint256 indexed gameId, address indexed player);
    event WerewolfDiscovered(uint256 indexed gameId, address indexed player);
    event VoteStarted(uint256 indexed gameId, address indexed initiator);
    event VoteCast(uint256 indexed gameId, address indexed voter, address indexed target);
    event GameOver(uint256 indexed gameId, bool werewolvesWon);

    // --- Modifiers ---
    modifier onlyGameAdmin(uint256 gameId) {
        require(games[gameId].admin == msg.sender, "Not game admin");
        _;
    }

    modifier onlyInGame(uint256 gameId) {
        require(games[gameId].inGame[msg.sender], "Not player in game");
        _;
    }

    modifier gameActive(uint256 gameId) {
        require(games[gameId].active, "Game not active");
        _;
    }

    // --- Core Functions ---
    function createGame(
        bytes calldata adminPublicKey,
        bytes32 userAddressesHash,
        address[] calldata players,
        uint256 numWerewolves,
        bytes32[] calldata userRoleCommitments
    ) external returns (uint256) {
        require(players.length == userRoleCommitments.length, "Players and commitments count mismatch");
        require(numWerewolves > 0 && numWerewolves < players.length, "Invalid werewolf count");

        uint256 gameId = nextGameId++;
        Game storage g = games[gameId];
        g.admin = msg.sender;
        g.adminPublicKey = adminPublicKey;
        g.userAddressesHash = userAddressesHash;
        g.numPlayers = players.length;
        g.numWerewolves = numWerewolves;
        g.active = true;
        g.turnNumber = 1;
        g.lastTurnTimestamp = block.timestamp;
        g.userRoleCommitments = userRoleCommitments;
        g.villagersAlive = players.length - numWerewolves;
        g.players = players;

        for (uint256 i = 0; i < players.length; i++) {
            g.inGame[players[i]] = true;
            emit PlayerAddedToGame(gameId, msg.sender, players[i]);
        }

        emit GameCreated(
            gameId, msg.sender, adminPublicKey, userAddressesHash, players.length, numWerewolves, userRoleCommitments
        );
        return gameId;
    }

    function startVote(uint256 gameId) external gameActive(gameId) onlyInGame(gameId) {
        Game storage g = games[gameId];
        require(!g.voteActive, "Vote already active");
        require(!g.hasInitiatedVote[msg.sender], "Already started a vote");

        g.voteActive = true;
        g.voteStartTime = block.timestamp;
        g.hasInitiatedVote[msg.sender] = true;
        emit VoteStarted(gameId, msg.sender);
    }

    function castVote(uint256 gameId, address target) external gameActive(gameId) onlyInGame(gameId) {
        Game storage g = games[gameId];
        require(g.voteActive, "No active vote");
        require(block.timestamp <= g.voteStartTime + VOTE_DURATION, "Vote time elapsed");
        require(!g.hasVoted[msg.sender], "Already voted");

        g.votesAgainstPlayer[target]++;
        g.hasVoted[msg.sender] = true;
        emit VoteCast(gameId, msg.sender, target);
    }

    function endVote(uint256 gameId) external onlyGameAdmin(gameId) gameActive(gameId) {
        Game storage g = games[gameId];
        require(g.voteActive, "No active vote");
        require(block.timestamp >= g.voteStartTime + VOTE_DURATION, "Vote time not elapsed");

        address mostVoted;
        uint256 maxVotes;
        uint256 playersLength = g.players.length;

        for (uint256 i = 0; i < playersLength; i++) {
            address player = g.players[i];
            if (g.inGame[player]) {
                uint256 votes = g.votesAgainstPlayer[player];
                if (votes > maxVotes) {
                    maxVotes = votes;
                    mostVoted = player;
                }
            }
        }

        if (mostVoted != address(0)) {
            g.inGame[mostVoted] = false;
            emit PlayerVotedOut(gameId, mostVoted);
        }

        g.voteActive = false;

        for (uint256 i = 0; i < playersLength; i++) {
            address player = g.players[i];
            delete g.votesAgainstPlayer[player];
            delete g.hasVoted[player];
        }
    }

    function commitMove(uint256 gameId, bytes32 moveCommitment) external gameActive(gameId) onlyInGame(gameId) {
        Game storage g = games[gameId];
        require(g.moveCommitments[msg.sender] == 0, "Already submitted move this turn");

        g.moveCommitments[msg.sender] = moveCommitment;
        g.currentMoveCommitments.push(moveCommitment);
        emit MoveCommitted(gameId, msg.sender, moveCommitment);
    }

    function endTurn(uint256 gameId, bytes32[] calldata commitments) external gameActive(gameId) {
        Game storage g = games[gameId];
        require(block.timestamp >= g.lastTurnTimestamp + TURN_DURATION, "Turn time not elapsed");
        require(!g.voteActive, "Vote must be completed before turn is marked as over");

        emit TurnEnded(gameId, g.turnNumber, commitments);
        delete g.currentMoveCommitments;
        g.turnNumber++;
        g.lastTurnTimestamp = block.timestamp;
    }

    function reportEndOfTurnEvents(
        uint256 gameId,
        address[] calldata playersKilled,
        address[] calldata werewolvesDiscovered,
        bool gameOverReached,
        bool werewolvesWon
    ) external onlyGameAdmin(gameId) {
        Game storage g = games[gameId];
        require(!g.gameOver, "Game is already over!");
        require(block.timestamp >= g.lastTurnTimestamp + TURN_DURATION, "Too soon to start next turn");

        for (uint256 i = 0; i < playersKilled.length; i++) {
            address player = playersKilled[i];
            g.inGame[player] = false;
            g.villagersAlive;
            emit PlayerKilled(gameId, player);
        }

        for (uint256 i = 0; i < werewolvesDiscovered.length; i++) {
            address player = werewolvesDiscovered[i];
            g.inGame[player] = false;
            emit WerewolfDiscovered(gameId, player);
            g.werewolvesDiscovered++;
        }

        if (gameOverReached) {
            g.active = false;
            g.gameOver = true;
            emit GameOver(gameId, werewolvesWon);
        }

        g.lastTurnTimestamp = block.timestamp;
    }

    // --- View Functions ---
    function getUserRoleCommitments(uint256 gameId) external view returns (bytes32[] memory) {
        return games[gameId].userRoleCommitments;
    }

    function getCurrentMoveCommitments(uint256 gameId) external view returns (bytes32[] memory) {
        return games[gameId].currentMoveCommitments;
    }

    function isPlayerInGame(uint256 gameId, address player) external view returns (bool) {
        return games[gameId].inGame[player];
    }

    function isGameVoteActive(uint256 gameId) external view returns (bool) {
        return games[gameId].voteActive;
    }

    function isGameOver(uint256 gameId) external view returns (bool) {
        return games[gameId].gameOver;
    }

    function getUserAddressesHash(uint256 gameId) external view returns (bytes32) {
        return games[gameId].userAddressesHash;
    }

    function getNumPlayers(uint256 gameId) external view returns (uint256) {
        return games[gameId].numPlayers;
    }

    function getNumWerewolves(uint256 gameId) external view returns (uint256) {
        return games[gameId].numWerewolves;
    }

    function getUserRoleCommitment(uint256 gameId, uint256 index) external view returns (bytes32) {
        return games[gameId].userRoleCommitments[index];
    }

    function getMoveCommitment(uint256 gameId, address player) external view returns (bytes32) {
        return games[gameId].moveCommitments[player];
    }

    function getVotesAgainstPlayer(uint256 gameId, address player) external view returns (uint256) {
        return games[gameId].votesAgainstPlayer[player];
    }
}
