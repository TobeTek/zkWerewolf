import { decrypt as _decryptWithPrivateKey, encrypt as _encryptWithPubKey } from '@metamask/eth-sig-util';
import { buildPoseidon } from 'circomlibjs';
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
dotenv.config();

export const ZKWEREWOLF_CONTRACT_ADDRESS = '0x000';
export const RPC_URL = '';
export const ZKVERIFY_API_URL = "https://relayer-api.horizenlabs.io/api/v1";


const privateKey = process.env.ACCOUNT_PRIVATE_KEY;
if (!privateKey) throw new Error("Private key not found in .env");
console.log('Key: ', privateKey);

const wallet = new ethers.Wallet(privateKey);
console.log(wallet);

function createGame(playersPubKeys, noWerewolves) {
    // Takes a list of pubKeys
    // Uses ethers.computeAddress to get addresses
    // assigns random roles to each user, taking note of number of players and no. werewolves
    // For each player, their role, and a random number (generateRandomNumber), Encrypts it with player pubKey
    // Then post to createGame function the ZkWerewolf smart contract with the following signature
    // function createGame(
	// 	bytes calldata adminPublicKey,
	// 	bytes32 userAddressesHash,
	// 	address[] calldata players,
	// 	uint256 numWerewolves,
	// 	bytes32[] calldata userRoleCommitments
	// ) external returns (uint256) 
}

function getAllGamesForAddress(){
    // Retrieves all events from contract creation and filters for those with a particular user as a player
}

function hasInitiatedVote(){

}

function hasVoted(){
    // Check if vote is currentl active on that game, and check if 
    // the user is marked as voted
}

function hasBeenVotedOut(){

}

function hasBeenKilled(){

}

function startVote(){
    // Initiate a vote in the chain
}

function castVote(){
    // Pick who should be eliminated
}


function endVote(){

}

function getTurnEndTimestamp(){
    // game.lastTurnTimestamp + max_turn_duration
}


export function encryptMsgWithPubKey(data, publicKey) {
    const { ciphertext: encryptedData } = _encryptWithPubKey({ publicKey, data, version: 'x25519-xsalsa20-poly1305' });
    return encryptedData;
}

export function decryptMsgWithPrivateKey(ciphertext, privateKey) {
    return _decryptWithPrivateKey({
        encryptedData,
        privateKey: bob.ethereumPrivateKey,
    });
}

export function generateRandomNumber(){
    // Create a full-blown wallet in our search for entropy?
    // Why not!
    return ethers.Wallet.createRandom().privateKey;
}


async function poseidonHash() { 
    const poseidon = await buildPoseidon();
    
}

function hexToUint8Array(hex) {
    if (hex.startsWith('0x')) hex = hex.slice(2);
    if (hex.length % 2 !== 0) hex = '0' + hex;

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

// Won't be needed, we'll use timestamp and scheduled time
// To make sure we 
function setUpEventListeners() {
    
}
