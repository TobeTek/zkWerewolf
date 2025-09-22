import { decrypt as _decryptWithPrivateKey, encrypt as _encryptWithPubKey } from '@metamask/eth-sig-util';
import { buildPoseidon } from 'circomlibjs';
import * as dotenv from 'dotenv';
import { ethers, keccak256, encodeRlp, toBeHex } from 'ethers';
import fs from 'fs';
import path from 'path';
import nacl from 'tweetnacl';

dotenv.config();

// --- Constants ---
export const PLAYER_TYPES = {
    Villager: 0,
    Werewolf: 1,
};

// --- Game State ---
export const games = {};
export const gameLogs = [];
const logFilePath = path.join(process.cwd(), 'game.log');

// --- Helper Functions ---
export function encryptMsgWithPubKey(data, publicKey) {
    const { ciphertext: encryptedData } = _encryptWithPubKey({
        publicKey,
        data,
        version: 'x25519-xsalsa20-poly1305'
    });
    return encryptedData;
}

export function decryptMsgWithPrivateKey(ciphertext, privateKey) {
    return _decryptWithPrivateKey({
        encryptedData: ciphertext,
        privateKey,
    });
}

export function generateRandomNumber() {
    return ethers.Wallet.createRandom().privateKey;
}

export function formatAddress(address) {
    if (!address || address.length < 10) return address;
    const start = address.slice(0, 6);
    const end = address.slice(address.length - 4);
    return `${start}...${end}`;
}

export function hexToUint8Array(hex) {
    if (hex.startsWith('0x')) hex = hex.slice(2);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

export async function poseidonHash(inputs) {
    const poseidon = await buildPoseidon();
    return poseidon(inputs);
}

export function getbase64PubKey(publicKey) {
    const rawPubKeyHex = publicKey.substring(4);
    const rawPubKeyBytes = new Uint8Array(rawPubKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const base64PubKey = Buffer.from(rawPubKeyBytes).toString('base64');
    return base64PubKey;
}

export function get25519KeyPair(privateKey) {
    const rawPrivateKeyHex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const privateKeyBytes = Buffer.from(rawPrivateKeyHex, 'hex');
    const keyPair = nacl.box.keyPair.fromSecretKey(privateKeyBytes);
    const publicKeyBase64 = Buffer.from(keyPair.publicKey).toString('base64');
    return { ...keyPair, publicKeyBase64 };
}

export function getZkWerewolfContractAddress() {
    console.log(ZkWerewolfABI.transaction.from, ZkWerewolfABI.transaction.nonce);
    return getContractAddress(ZkWerewolfABI.transaction.from, ZkWerewolfABI.transaction.nonce)
}

export function getContractAddress(senderAddress, nonce) {
    // Ensure the nonce is a BigInt for RLP encoding
    const formattedNonce = toBigInt(nonce);

    // RLP-encode the sender address and nonce
    const a = zeroPadBytes(toBeHex(formattedNonce), 32);
    const rlpEncoded = encodeRlp([senderAddress, a]);

    // Hash the RLP-encoded data and get the last 20 bytes
    const contractAddress = getAddress('0x' + keccak256(rlpEncoded).substring(26));

    return contractAddress;
}

// --- Game Simulation Functions ---
export function createGame({ adminPubKey, players, playersEncryptPubKeys, numPlayers, noWerewolves }) {
    const gameId = Object.keys(games).length + 1;
    const userAddressesHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(['address[]'], [players])
    );

    const playerRoles = [];
    for (let i = 0; i < noWerewolves; i++) playerRoles.push(PLAYER_TYPES.Werewolf);
    for (let i = 0; i < numPlayers - noWerewolves; i++) playerRoles.push(PLAYER_TYPES.Villager);

    // Shuffle roles
    for (let i = playerRoles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playerRoles[i], playerRoles[j]] = [playerRoles[j], playerRoles[i]];
    }

    const userRoleCommitments = playersEncryptPubKeys.map((pKey, index) => {
        const player = players[index];
        const role = playerRoles[index];
        const secret = generateRandomNumber();
        return encryptMsgWithPubKey(JSON.stringify({ player, role, secret }), pKey);
    });

    games[gameId] = {
        admin: players[0],
        adminPubKey,
        userAddressesHash,
        numPlayers,
        noWerewolves,
        players,
        playerRoles,
        userRoleCommitments,
        inGame: players.reduce((acc, player) => ({ ...acc, [player]: true }), {}),
        moveCommitments: {},
        hasInitiatedVote: {},
        hasVoted: {},
        votesAgainstPlayer: {},
        turnNumber: 1,
        lastTurnTimestamp: Date.now(),
        gameOver: false,
        active: true,
        voteActive: false,
        voteStartTime: 0,
        werewolvesDiscovered: 0,
        villagersAlive: numPlayers - noWerewolves,
        currentMoveCommitments: [],
    };

    logAction(`Game ${gameId} created with ${numPlayers} players and ${noWerewolves} werewolves.`);
    return gameId;
}

export function startVote(gameId, player) {
    const game = games[gameId];
    if (!game) throw new Error("Game not found");
    if (game.voteActive) throw new Error("Vote already active");
    if (game.hasInitiatedVote[player]) throw new Error("Already started a vote");

    game.voteActive = true;
    game.voteStartTime = Date.now();
    game.hasInitiatedVote[player] = true;

    logAction(`Vote started in game ${gameId} by ${formatAddress(player)}.`);
}

export function castVote(gameId, voter, target) {
    const game = games[gameId];
    if (!game) throw new Error("Game not found");
    if (!game.voteActive) throw new Error("No active vote");
    if (Date.now() > game.voteStartTime + 3 * 60 * 1000) throw new Error("Vote time elapsed");
    if (game.hasVoted[voter]) throw new Error("Already voted");

    game.votesAgainstPlayer[target] = (game.votesAgainstPlayer[target] || 0) + 1;
    game.hasVoted[voter] = true;

    logAction(`Vote cast in game ${gameId} by ${formatAddress(voter)} against ${formatAddress(target)}.`);
}

export function endVote(gameId) {
    const game = games[gameId];
    if (!game) throw new Error("Game not found");
    if (!game.voteActive) throw new Error("No active vote");
    if (Date.now() < game.voteStartTime + 3 * 60 * 1000) throw new Error("Vote time not elapsed");

    let mostVoted = null;
    let maxVotes = 0;

    game.players.forEach(player => {
        if (game.inGame[player]) {
            const votes = game.votesAgainstPlayer[player] || 0;
            if (votes > maxVotes) {
                maxVotes = votes;
                mostVoted = player;
            }
        }
    });

    if (mostVoted) {
        game.inGame[mostVoted] = false;
        game.villagersAlive--;
        logAction(`Player ${formatAddress(mostVoted)} was voted out in game ${gameId}.`);
    }

    game.voteActive = false;
    game.hasInitiatedVote = {};
    game.hasVoted = {};
    game.votesAgainstPlayer = {};

    logAction(`Vote ended in game ${gameId}.`);
}

export function commitMove(gameId, player, moveCommitment) {
    const game = games[gameId];
    if (!game) throw new Error("Game not found");
    if (!game.inGame[player]) throw new Error("Player not in game");
    if (game.moveCommitments[player]) throw new Error("Already submitted move this turn");

    game.moveCommitments[player] = moveCommitment;
    game.currentMoveCommitments.push(moveCommitment);

    logAction(`Move committed in game ${gameId} by ${formatAddress(player)}.`);
}

export function endTurn(gameId, commitments) {
    const game = games[gameId];
    if (!game) throw new Error("Game not found");
    if (Date.now() < game.lastTurnTimestamp + 3 * 60 * 1000) throw new Error("Turn time not elapsed");
    if (game.voteActive) throw new Error("Vote must be completed before turn is marked as over");

    game.turnNumber++;
    game.lastTurnTimestamp = Date.now();
    game.currentMoveCommitments = [];

    logAction(`Turn ${game.turnNumber} ended in game ${gameId}.`);
}

export function reportEndOfTurnEvents(gameId, playersKilled, werewolvesDiscovered, gameOverReached, werewolvesWon) {
    const game = games[gameId];
    if (!game) throw new Error("Game not found");
    if (game.gameOver) throw new Error("Game is already over");
    if (Date.now() < game.lastTurnTimestamp + 3 * 60 * 1000) throw new Error("Too soon to start next turn");

    playersKilled.forEach(player => {
        game.inGame[player] = false;
        game.villagersAlive--;
        logAction(`Player ${formatAddress(player)} was killed in game ${gameId}.`);
    });

    werewolvesDiscovered.forEach(player => {
        game.inGame[player] = false;
        game.werewolvesDiscovered++;
        logAction(`Werewolf ${formatAddress(player)} was discovered in game ${gameId}.`);
    });

    if (gameOverReached) {
        game.active = false;
        game.gameOver = true;
        logAction(`Game ${gameId} over. Werewolves ${werewolvesWon ? 'won' : 'lost'}.`);
    }

    game.lastTurnTimestamp = Date.now();
}

// --- Simulate Other Players ---
export function simulateMoveCommitment(gameId, player, moveCommitment) {
    commitMove(gameId, player, moveCommitment);
}

export function simulateVote(gameId, voter, target) {
    castVote(gameId, voter, target);
}

// --- Game State Accessors ---
export function getGame(gameId) {
    return games[gameId];
}

export function getAllGames() {
    return games;
}

export function getPlayerRole(gameId, player) {
    const game = games[gameId];
    if (!game) throw new Error("Game not found");
    const index = game.players.indexOf(player);
    return game.playerRoles[index];
}

// --- Logging ---
export function logAction(action) {
    const logEntry = `${new Date().toISOString()} - ${action}\n`;
    gameLogs.push(action);
    try {
        fs.appendFileSync(logFilePath, logEntry);
        console.log('Logged action to file:', action);
    } catch (error) {
        console.error('Failed to write to log file:', error);
    }
    console.log('Logged action:', action);
}
