import {
  PLAYER_TYPES,
  createGame,
  startVote,
  castVote,
  endVote,
  commitMove,
  endTurn,
  reportEndOfTurnEvents,
  simulateMoveCommitment,
  simulateVote,
  getGame,
  getAllGames,
  getPlayerRole,
  logAction,
  get25519KeyPair,
  generateRandomNumber,
  gameLogs
} from './services.js';

// --- Setup ---
// Generate key pairs for admin and players
const adminKeyPair = get25519KeyPair(generateRandomNumber());
const playerKeyPairs = Array(4).fill().map(() => get25519KeyPair(generateRandomNumber()));
const players = [
  '0x1234567890123456789012345678901234567890',
  '0x2345678901234567890123456789012345678901',
  '0x3456789012345678901234567890123456789012',
  '0x4567890123456789012345678901234567890123',
];
const playersEncryptPubKeys = playerKeyPairs.map(kp => kp.publicKeyBase64);

// --- Game Creation ---
console.log('--- Creating Game ---');
const gameId = createGame({
  adminPubKey: adminKeyPair.publicKeyBase64,
  players,
  playersEncryptPubKeys,
  numPlayers: 4,
  noWerewolves: 1,
});
console.log(`Game created with ID: ${gameId}`);

// --- Simulate Moves ---
console.log('\n--- Simulating Moves ---');
commitMove(gameId, players[0], 'kill_player_2');
commitMove(gameId, players[1], 'protect_player_3');
simulateMoveCommitment(gameId, players[2], 'skip');
simulateMoveCommitment(gameId, players[3], 'investigate');
console.log('Moves committed.');

// --- End Turn ---
console.log('\n--- Ending Turn ---');
const game = getGame(gameId);
game.lastTurnTimestamp = Date.now() - 3 * 60 * 1000 - 1000; // Simulate 3 minutes passed
endTurn(gameId, game.currentMoveCommitments);
console.log('Turn ended.');

// --- Simulate Votes ---
console.log('\n--- Simulating Votes ---');
startVote(gameId, players[0]);
castVote(gameId, players[1], players[2]);
castVote(gameId, players[2], players[2]);
castVote(gameId, players[3], players[3]);
simulateVote(gameId, players[0], players[2]);
console.log('Votes cast.');

// --- End Vote ---
console.log('\n--- Ending Vote ---');
game.voteStartTime = Date.now() - 3 * 60 * 1000 - 1000; // Simulate 3 minutes passed
endVote(gameId);
console.log('Vote ended.');

game.lastTurnTimestamp = new Date() - 10000*60*15;
// --- Report End of Turn Events ---
console.log('\n--- Reporting End of Turn Events ---');
reportEndOfTurnEvents(
  gameId,
  [players[3]],
  [players[0]],
  true,
  false
);
console.log('Game over reported.');

// --- Log Game State ---
console.log('\n--- Final Game State ---');
const finalGame = getGame(gameId);
console.log('Game ID:', gameId);
console.log('Players:', finalGame.players);
console.log('Player Roles:', finalGame.playerRoles);
console.log('Players In Game:', finalGame.players.filter(p => finalGame.inGame[p]));
console.log('Players Out:', finalGame.players.filter(p => !finalGame.inGame[p]));
console.log('Werewolves Discovered:', finalGame.werewolvesDiscovered);
console.log('Game Over:', finalGame.gameOver);
console.log('Winner: Villagers');

// --- Log All Games ---
console.log('\n--- All Games ---');
const allGames = getAllGames();
console.log('Total Games:', Object.keys(allGames).length);
Object.keys(allGames).forEach(id => {
  console.log(`Game ${id}:`, allGames[id]);
});

// --- Log Player Roles ---
console.log('\n--- Player Roles ---');
players.forEach(player => {
  const role = getPlayerRole(gameId, player);
  console.log(`${player}: ${role === PLAYER_TYPES.Werewolf ? 'Werewolf' : 'Villager'}`);
});

// --- Log Actions ---
console.log('\n--- Game Logs ---');
console.log('Total Logs:', gameLogs.length);
gameLogs.forEach((log, i) => {
  console.log(`${i + 1}: ${log}`);
});
