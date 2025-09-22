import { ethers } from 'ethers';
import {
    contract,
    createGame,
    get25519KeyPair,
    getAllGamesForAddress,
    logAction
} from './services.js';



async function main() {
    logAction("Starting Zk-Werewolf Contract Test Suite");
    const testGameId = 1;
    const players = [];
    const numPlayers = 5;
    const numWerewolves = 1;

    // --- 1. Prepare Test Accounts ---
    logAction("Preparing test accounts...");
    for (let i = 0; i < numPlayers; i++) {
        const wallet = ethers.Wallet.createRandom();
        players.push(wallet);
    }

    const admin = new ethers.Wallet(process.env.ACCOUNT_PRIVATE_KEY);
    const player2 = players[1];
    const player3 = players[2];
    const player4 = players[3];
    const player5 = players[4];

    const adminPubKey = get25519KeyPair(admin.privateKey).publicKey;
    const playerPubKeys = players.map(p => get25519KeyPair(p.privateKey).publicKeyBase64);

    // Set the contract's wallet to the admin to perform game setup
    contract.connect(admin);

    // --- 2. Test createGame() ---
    logAction("Testing createGame()...");
    console.log('AdminPubKey: ', adminPubKey, admin.address)
    const gameId = await createGame({
        adminPubKey,
        players: players.map(p => p.address),
        playersEncryptPubKeys: playerPubKeys,
        numPlayers,
        noWerewolves: numWerewolves
    });
    console.log(`✓ Game created with ID: ${gameId}`);

    // --- 3. Test getAllGamesForAddress() ---
    logAction("Testing getAllGamesForAddress()...");
    const gamesForAdmin = await getAllGamesForAddress(admin.address);
    // if (!gamesForAdmin.includes(gameId.toString())) {
    //     throw new Error("Admin's game not found in list.");
    // }

    // --- 4. Test commitMove() ---
    logAction("Testing commitMove()...");
    const player2Contract = contract.connect(player2);
    await player2Contract.commitMove(gameId, "0xabc123");
    console.log("✓ Player 2 committed a move.");

    const player3Contract = contract.connect(player3);
    await player3Contract.commitMove(gameId, "0xdef456");
    console.log("✓ Player 3 committed a move.");

    // --- 5. Test endTurn() ---
    logAction("Testing endTurn()...");
    // Note: The endTurn function in the provided code does not use the commitments array.
    // It's likely for a future version or a different event log.
    const emptyCommitments = [];
    await new Promise(resolve => setTimeout(resolve, 3 * 60 * 1000)); // Wait for turn duration
    await contract.endTurn(gameId, emptyCommitments);
    console.log("✓ Turn ended.");

    // --- 6. Test startVote() and castVote() ---
    logAction("Testing startVote() and castVote()...");
    const player4Contract = contract.connect(player4);
    await player4Contract.startVote(gameId);
    console.log("✓ Player 4 started a vote.");

    await player2Contract.castVote(gameId, player5.address);
    console.log("✓ Player 2 voted for Player 5.");

    await player3Contract.castVote(gameId, player5.address);
    console.log("✓ Player 3 voted for Player 5.");

    // --- 7. Test endVote() ---
    logAction("Testing endVote()...");
    await new Promise(resolve => setTimeout(resolve, 3 * 60 * 1000)); // Wait for vote duration
    await contract.endVote(gameId);
    console.log("✓ Vote ended. Player 5 should be voted out.");

    // --- 8. Test reportEndOfTurnEvents() ---
    logAction("Testing reportEndOfTurnEvents()...");
    const playersKilled = [player5.address];
    const werewolvesDiscovered = []; // Assuming no werewolves were discovered
    await contract.reportEndOfTurnEvents(gameId, playersKilled, werewolvesDiscovered, false, false);
    console.log("✓ End of turn events reported. Player 5 should be marked as killed.");

    // --- 9. Test View Functions ---
    logAction("Testing view functions...");
    const isAdminInGame = await contract.isPlayerInGame(gameId, admin.address);
    console.log(`✓ Is admin in game? ${isAdminInGame}`);
    const isPlayer5InGame = await contract.isPlayerInGame(gameId, player5.address);
    console.log(`✓ Is Player 5 in game? ${isPlayer5InGame}`);
    if (isPlayer5InGame) {
        throw new Error("Player 5 should not be in game after being killed.");
    }

    console.log("\n✅ All tests passed successfully!");

}

// Start the test suite
main().catch(error => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
});