const RPC_URL = '';

function getUserPrivateKey() {
	// Load from key.env.
	// If it contains a mnemonic, load the first account
	// If it contains a private key, load that account
}

function getUserPublicKey() {}

function signMessage() {}

function poseidonHash() {}

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
