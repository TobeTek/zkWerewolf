import { buildPoseidon } from 'circomlibjs';
import axios from "axios";
import { Buffer } from "buffer";
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

export const ZKWEREWOLF_CONTRACT_ADDRESS = '0x000';
export const RPC_URL = '';
export const ZKVERIFY_API_URL = "https://relayer-api.horizenlabs.io/api/v1";


const privateKey = process.env.ACCOUNT_PRIVATE_KEY;
if (!privateKey) throw new Error("Private key not found in .env");
console.log('Key: ', privateKey);

const wallet = new ethers.Wallet(privateKey);
console.log(wallet);

function getUserPrivateKey() {
	// Load from key.env.
	// If it contains a mnemonic, load the first account
	// If it contains a private key, load that account
}

function getUserPublicKey() {}

function signMessage() {}

function poseidonHash() {}

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
	//     daiContract.on("Transfer", (from, to, amount, event) => {
	//     console.log(`${ from } sent ${ formatEther(amount) } to ${ to}`);
	//     // The event object contains the verbatim log data, the
	//     // EventFragment and functions to fetch the block,
	//     // transaction and receipt and event functions
	// });
	// // A filter for when a specific address receives tokens
	// myAddress = "0x8ba1f109551bD432803012645Ac136ddd64DBA72";
	// filter = daiContract.filters.Transfer(null, myAddress)
	// // {
	// //   address: 'dai.tokens.ethers.eth',
	// //   topics: [
	// //     '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
	// //     null,
	// //     '0x0000000000000000000000008ba1f109551bd432803012645ac136ddd64dba72'
	// //   ]
	// // }
	// // Receive an event when that filter occurs
	// daiContract.on(filter, (from, to, amount, event) => {
	//     // The to will always be "address"
	//     console.log(`I got ${ formatEther(amount) } from ${ from }.`);
	// });
}
