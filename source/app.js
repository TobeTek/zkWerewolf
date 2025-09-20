import {Box, Text, useApp, useInput} from 'ink';
import Ascii from 'ink-ascii';
import BigText from 'ink-big-text';
import Divider from 'ink-divider';
import Gradient from 'ink-gradient';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import {Form} from 'ink-form';
import React, {useState} from 'react';

// --- NAVIGATION CONSTANTS ---
const navItems = [
	{label: 'Create Game', value: 'create'},
	{label: 'Join Game', value: 'join'},
	{label: 'Gameplay', value: 'gameplay'},
	{label: 'ZKP Proofs', value: 'proofs'},
	{label: 'View Winner', value: 'winner'},
	{label: 'Game History', value: 'history'},
	{label: 'Active Players', value: 'active_players'},
	{label: 'Exit', value: 'exit'},
];

// --- HELP GUIDE/KEY MAP FOOTER ---
function HelpGuide() {
	return (
		<Box marginTop={1} borderStyle="round" padding={1}>
			<Text color="gray">
				<Text bold>Navigation:</Text> Press <Text bold>M</Text> to open/close menu, Tab (switch focus), ↑/↓ (navigate), Enter (select)
			</Text>
			<Text color="gray">
				<Text bold>Gameplay:</Text> k (kill), v (vote), s (skip)
			</Text>
		</Box>
	);
}

// --- HEADER ---
function Header() {
	return (
		<Box marginBottom={1} alignSelf="center">
			<Gradient name="retro">
				<BigText text="zkWerewolf" font="simpleBlock" />
			</Gradient>
		</Box>
	);
}

// --- GENERAL LAYOUT ---
function MainLayout({children}) {
	return (
		<Box flexDirection="column">
			<Header />
			<Box flexDirection="row" flexGrow={1}>
				{children}
			</Box>
			<HelpGuide />
		</Box>
	);
}

// --- SIDEBAR ---
function SideBar({navItems, onSelect, isFocused, isOpen}) {
	if (!isOpen) return null;

	return (
		<Box
			borderStyle={isFocused ? 'double' : 'single'}
			flexDirection="column"
			padding={1}
			width={32}
			marginRight={1}
			alignItems="flex-start"
		>
			<Text bold color="cyan">Menu</Text>
			<SelectInput items={navItems} onSelect={onSelect} focus={isFocused} />
		</Box>
	);
}

// --- GAME CREATION FORM ---
function GameCreation({onCreate, isFocused}) {
	const form = {
		title: "Create New Game",
		sections: [
			{
				title: "Game Parameters",
				fields: [
					{
						type: 'string',
						name: 'addressList',
						label: 'Addresses (comma-separated)',
						placeholder: '0x...,0x...,0x...',
						required: true,
						description: 'Enter the wallet addresses of the players, separated by commas.',
					},
					{
						type: 'integer',
						name: 'numWerewolves',
						label: 'Number of Werewolves',
						initialValue: 1,
						min: 1,
						max: 5,
						required: true,
					},
					{
						type: 'integer',
						name: 'numVillagers',
						label: 'Number of Villagers',
						initialValue: 4,
						min: 1,
						max: 5,
						required: true,
						description: 'Total players (Werewolves + Villagers) must be 6 or less.',
					},
				],
			},
		],
	};

	const onSubmit = (values) => {
		const werewolves = parseInt(values.numWerewolves);
		const villagers = parseInt(values.numVillagers);
		if (werewolves + villagers > 6) {
			console.log('Total players must be 6 or less.');
			return;
		}
		onCreate(
			values.addressList.split(',').map(addr => addr.trim()),
			werewolves,
			villagers,
		);
	};

	return (
		<Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1}>
			<Form
				form={form}
				onSubmit={onSubmit}
				isFocused={isFocused}
			/>
		</Box>
	);
}

// --- JOIN GAME ---
function JoinGame({isFocused}) {
	const [gameCode, setGameCode] = useState('');
	return (
		<Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1}>
			<Text>Enter game code to join:</Text>
			<TextInput
				placeholder="Enter game code"
				value={gameCode}
				onChange={setGameCode}
				focus={isFocused}
			/>
			<Box marginTop={1}>
				<Text>Role will be assigned privately after join.</Text>
			</Box>
		</Box>
	);
}

// --- GAMEPLAY ACTIONS ---
function GamePlay({role, onAction, isFocused}) {
	const [target, setTarget] = useState('');
	useInput(
		(input, key) => {
			if (!isFocused) return;
			if (input === 'k' && role === 'Werewolf') onAction('kill', target);
			if (input === 'v') onAction('vote', '');
			if (input === 's') onAction('skip', '');
		},
		{isActive: isFocused},
	);
	return (
		<Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1}>
			<Gradient name="morning">
				<BigText text="Turn Actions" font="tiny" />
			</Gradient>
			<Text color="yellowBright">
				Your role: {role || 'Hidden (will be privately revealed)'}
			</Text>
			<Divider />
			<Text>Choose Action (k=Kill, v=Vote, s=Skip):</Text>
			{role === 'Werewolf' && (
				<Box>
					<Text>Target to kill:</Text>
					<TextInput value={target} onChange={setTarget} focus={isFocused} />
				</Box>
			)}
		</Box>
	);
}

// --- PROOF PANEL ---
function ProofPanel({pending}) {
	return (
		<Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1}>
			<Text color="blueBright">ZKP Proof Generation & Verification</Text>
			<Divider />
			{pending ? (
				<Box>
					<Spinner type="dots" />
					<Text color="yellowBright"> Proving and verifying move...</Text>
				</Box>
			) : (
				<Text color="greenBright">Proof accepted! Move recorded.</Text>
			)}
		</Box>
	);
}

// --- WINNER PANEL ---
function WinnerPanel({winner}) {
	return (
		<Box flexDirection="column" padding={2} borderStyle="double" flexGrow={1}>
			<Gradient name="pastel">
				<BigText text="GAME OVER" font="tiny" />
			</Gradient>
			<Text color="greenBright">
				{winner ? `Winner: ${winner}` : 'Calculating winner...'}
			</Text>
		</Box>
	);
}

// --- HISTORY PANEL ---
function GameHistory({history}) {
	return (
		<Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1}>
			<Text>Game History:</Text>
			<Divider />
			{history && history.length > 0 ? (
				history.map((entry, idx) => (
					<Text key={idx}>
						Turn {idx + 1}: {entry.action} by {entry.player}{' '}
						{entry.target ? `-> Target: ${entry.target}` : ''} {entry.status}
					</Text>
				))
			) : (
				<Text color="gray">No actions yet.</Text>
			)}
		</Box>
	);
}

// --- ACTIVE PLAYERS PANEL ---
function ActivePlayersPanel({players}) {
	return (
		<Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1}>
			<Text color="cyanBright">Active Players:</Text>
			{players && players.length ? (
				players.map((player, idx) => <Text key={idx}>{player}</Text>)
			) : (
				<Text color="gray">No players active.</Text>
			)}
		</Box>
	);
}

// --- MAIN APP ---
export default function App() {
	const [currentNavItem, setCurrentNavItem] = useState(navItems[0]);
	const [role, setRole] = useState(null);
	const [history, setHistory] = useState([]);
	const [winner, setWinner] = useState(null);
	const [players, setPlayers] = useState(['Alice', 'Bob', 'Carol']);
	const [focusedSection, setFocusedSection] = useState('content');
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const {exit} = useApp();

	useInput((input, key) => {
		if (input === 'm') {
			setIsMenuOpen(!isMenuOpen);
			setFocusedSection(isMenuOpen ? 'content' : 'sidebar');
		}
		if (key.tab && isMenuOpen) {
			setFocusedSection(prev => (prev === 'sidebar' ? 'content' : 'sidebar'));
		}
	});

	const onNavItemSelected = item => {
		if (item.value === 'exit') exit();
		else {
			setCurrentNavItem(item);
			setFocusedSection('content');
			setIsMenuOpen(false);
		}
	};

	const handleGameCreate = (addresses, werewolves, villagers) => {
		setPlayers(addresses);
		setRole(null);
		setHistory([]);
		setWinner(null);
		setCurrentNavItem(navItems[2]);
	};

	const handleAction = (action, target) => {
		setHistory(h => [
			...h,
			{action, player: 'You', target, status: 'proof pending'},
		]);
		setTimeout(() => {
			setHistory(h =>
				h.map((entry, i) =>
					i === h.length - 1 ? {...entry, status: 'verified'} : entry,
				),
			);
			if (action === 'kill' && target === 'Alice') setWinner('Werewolves');
			else if (action === 'vote') setWinner('Villagers');
		}, 2000);
	};

	return (
		<MainLayout>
			<SideBar
				navItems={navItems}
				onSelect={onNavItemSelected}
				isFocused={focusedSection === 'sidebar'}
				isOpen={isMenuOpen}
			/>
			<Box flexDirection="column" flexGrow={1}>
				{currentNavItem.value === 'create' && (
					<GameCreation
						onCreate={handleGameCreate}
						isFocused={focusedSection === 'content'}
					/>
				)}
				{currentNavItem.value === 'join' && (
					<JoinGame isFocused={focusedSection === 'content'} />
				)}
				{currentNavItem.value === 'gameplay' && (
					<GamePlay
						role={role}
						onAction={handleAction}
						isFocused={focusedSection === 'content'}
					/>
				)}
				{currentNavItem.value === 'proofs' && (
					<ProofPanel
						pending={history.some(e => e.status === 'proof pending')}
					/>
				)}
				{currentNavItem.value === 'winner' && <WinnerPanel winner={winner} />}
				{currentNavItem.value === 'history' && (
					<GameHistory history={history} />
				)}
				{currentNavItem.value === 'active_players' && (
					<ActivePlayersPanel players={players} />
				)}
			</Box>
		</MainLayout>
	);
}
