import { decrypt as _decryptWithPrivateKey, encrypt as _encryptWithPubKey } from '@metamask/eth-sig-util';
import { buildPoseidon } from 'circomlibjs';
import * as dotenv from 'dotenv';
import { encodeRlp, ethers, getAddress, keccak256, toBeHex, toBigInt, zeroPadBytes } from 'ethers';
import fs from 'fs';
import path from 'path';
import ZkWerewolfABI from '../forgeDeployment.json' with { type: 'json' };
import nacl from 'tweetnacl';

dotenv.config();

// export const ZKWEREWOLF_CONTRACT_ADDRESS = '0x000'; // Replace with your contract address
export const RPC_URL = 'http://localhost:8545'; // Replace with your RPC URL
export const ZKVERIFY_API_URL = "https://relayer-api.horizenlabs.io/api/v1";
export const PLAYER_TYPES = {
    Villager: 0,
    Werewolf: 1,
};

// Initialize contract
const provider = new ethers.JsonRpcProvider(RPC_URL);
const privateKey = process.env.ACCOUNT_PRIVATE_KEY;
if (!privateKey) throw new Error("Private key not found in .env");
const wallet = new ethers.Wallet(privateKey, provider);
export const contract = new ethers.Contract(getZkWerewolfContractAddress(), ZkWerewolfABI.abi, wallet);


// --- Helper Functions ---
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

export function encryptMsgWithPubKey(data, publicKey) {
    console.log('encryptMsgWithPubKey: ', publicKey);
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

async function poseidonHash(inputs) {
    const poseidon = await buildPoseidon();
    return poseidon(inputs);
}

export function getbase64PubKey(publicKey) {
    const rawPubKeyHex = publicKey.substring(4);

    // 2. Convert the raw hex string to a Uint8Array of bytes.
    const rawPubKeyBytes = new Uint8Array(rawPubKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    // 3. Convert the Uint8Array to a Base64 encoded string.
    const base64PubKey = Buffer.from(rawPubKeyBytes).toString('base64');
    return base64PubKey
}

export function get25519KeyPair(privateKey) {
    const rawPrivateKeyHex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const privateKeyBytes = Buffer.from(rawPrivateKeyHex, 'hex');
    const keyPair = nacl.box.keyPair.fromSecretKey(privateKeyBytes);
    const publicKeyBase64 = Buffer.from(keyPair.publicKey).toString('base64');

    return { ...keyPair, publicKeyBase64 };
}

// --- Core Service Functions ---
export async function createGame({ adminPubKey, players, playersEncryptPubKeys, numPlayers, noWerewolves }) {
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

    const tx = await contract.createGame(
        adminPubKey,
        userAddressesHash,
        players,
        noWerewolves,
        userRoleCommitments
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => log.topics[0] === ethers.id('GameCreated(uint256,address,bytes,bytes32,uint256,uint256,bytes32[])'));
    // const decodedLog = contract.interface.decodeEventLog('GameCreated', event?.data, event?.topics);
    // console.log(decodedLog);
    // return decodedLog;
}

export async function getAllGamesForAddress(address) {
    const filter = contract.filters.PlayerAddedToGame(null, null, address);
    console.log('Filters: ', contract.filters);
    const events = await contract.queryFilter("GameCreated");
    console.log('All events:' , events);
    return [...new Set(events.map(event => event.args.gameId.toString()))];
}

export async function hasInitiatedVote(gameId, address) {
    return contract.isPlayerInGame(gameId, address) && (await contract.hasInitiatedVote(gameId, address));
}

export async function hasVoted(gameId, address) {
    return contract.isPlayerInGame(gameId, address) && (await contract.hasVoted(gameId, address));
}

export async function hasBeenVotedOut(gameId, address) {
    return !(await contract.isPlayerInGame(gameId, address));
}

export async function hasBeenKilled(gameId, address) {
    return !(await contract.isPlayerInGame(gameId, address));
}

export async function startVote(gameId) {
    const tx = await contract.startVote(gameId);
    await tx.wait();
}

export async function castVote(gameId, target) {
    const tx = await contract.castVote(gameId, target);
    await tx.wait();
}

export async function endVote(gameId) {
    const tx = await contract.endVote(gameId);
    await tx.wait();
}

export async function getTurnEndTimestamp(gameId) {
    const lastTurnTimestamp = await contract.getLastTurnTimestamp(gameId);
    return lastTurnTimestamp.toNumber() + 3 * 60; // 3 minutes in seconds
}

export async function commitMove(gameId, moveCommitment) {
    const tx = await contract.commitMove(gameId, moveCommitment);
    await tx.wait();
}

export async function endTurn(gameId, commitments) {
    const tx = await contract.endTurn(gameId, commitments);
    await tx.wait();
}

export async function reportEndOfTurnEvents(gameId, playersKilled, werewolvesDiscovered, gameOverReached, werewolvesWon) {
    const tx = await contract.reportEndOfTurnEvents(gameId, playersKilled, werewolvesDiscovered, gameOverReached, werewolvesWon);
    await tx.wait();
}

// --- Event Listeners ---
export function setupEventListeners(callbacks) {
    contract.on('GameCreated', callbacks.onGameCreated);
    contract.on('PlayerAddedToGame', callbacks.onPlayerAdded);
    contract.on('MoveCommitted', callbacks.onMoveCommitted);
    contract.on('TurnEnded', callbacks.onTurnEnded);
    contract.on('PlayerKilled', callbacks.onPlayerKilled);
    contract.on('PlayerVotedOut', callbacks.onPlayerVotedOut);
    contract.on('WerewolfDiscovered', callbacks.onWerewolfDiscovered);
    contract.on('VoteStarted', callbacks.onVoteStarted);
    contract.on('VoteCast', callbacks.onVoteCast);
    contract.on('GameOver', callbacks.onGameOver);
}

export function removeEventListeners(callbacks) {
    contract.off('GameCreated', callbacks.onGameCreated);
    contract.off('PlayerAddedToGame', callbacks.onPlayerAdded);
    contract.off('MoveCommitted', callbacks.onMoveCommitted);
    contract.off('TurnEnded', callbacks.onTurnEnded);
    contract.off('PlayerKilled', callbacks.onPlayerKilled);
    contract.off('PlayerVotedOut', callbacks.onPlayerVotedOut);
    contract.off('WerewolfDiscovered', callbacks.onWerewolfDiscovered);
    contract.off('VoteStarted', callbacks.onVoteStarted);
    contract.off('VoteCast', callbacks.onVoteCast);
    contract.off('GameOver', callbacks.onGameOver);
}

// --- Game Logs ---
export const gameLogs = [];
const logFilePath = path.join(process.cwd(), 'game.log');
export function logAction(action) {
    const logEntry = `${new Date().toISOString()} - ${action}\n`;
    gameLogs.push(action);

    // Use fs.appendFileSync for synchronous, simple logging
    try {
        fs.appendFileSync(logFilePath, logEntry);
        console.log('Logged action to file:', action);
    } catch (error) {
        console.error('Failed to write to log file:', error);
    }
    console.log('Logged action:', action);
}
