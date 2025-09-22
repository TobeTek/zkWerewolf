import fs from 'fs';
import { Box, Text, useApp, useInput } from 'ink';
import BigText from 'ink-big-text';
import Divider from 'ink-divider';
import { Form } from 'ink-form';
import Gradient from 'ink-gradient';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet, useZkWerewolfGame } from './hooks.js';
import { createGame, formatAddress, gameLogs, getAllGamesForAddress } from './services.js';

// --- HELP GUIDE/KEY MAP FOOTER ---
const HelpGuide = React.memo(() => (
    <Box marginTop={1} borderStyle="round" padding={1}>
        <Text color="gray">
            <Text bold>Navigation:</Text> Press <Text bold>M</Text> to open/close menu, ↑/↓ (navigate), Enter (select)
        </Text>
        <Text color="gray">
            <Text bold>Gameplay:</Text> k (kill), v (vote), s (skip)
        </Text>
    </Box>
));

// --- HEADER ---
const Header = ({ wallet, selectedGame, currentNavItem }) => {
    const { getEncryptKeyPair } = useWallet();
    return (
        <Box flexDirection="column" alignItems="center" marginBottom={1}>
            <Box>
                <Gradient name="retro" scale={0.5}>
                    <BigText text="zkWerewolf" font="tiny" />
                </Gradient>
            </Box>
            <Box flexDirection="column" alignItems="center">
                <Text bold>
                    Public Key: {formatAddress(wallet?.address) || 'Loading wallet...'}
                </Text>
                <Text>
                    Invite Key: {wallet && getEncryptKeyPair().publicKeyBase64}
                </Text>
                {currentNavItem === 'play_game' && selectedGame && (
                    <Box marginTop={1}>
                        <Text bold>
                            {selectedGame.state === 'Game over' ? '🏆 ' : '🎮 '}
                            {selectedGame.id} | Role: {selectedGame.role} | Alive: {selectedGame.playersAlive} | Dead: {selectedGame.playersDead}
                        </Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

// --- GENERAL LAYOUT ---
const MainLayout = React.memo(
    ({ children, wallet, selectedGame, currentNavItem }) => (
        <Box flexDirection="column" height="100%">
            <Header wallet={wallet} selectedGame={selectedGame} currentNavItem={currentNavItem} />
            <Box flexDirection="row" flexGrow={1} minHeight={0}>
                {children}
            </Box>
            <HelpGuide />
        </Box>
    ),
);

// --- SIDEBAR ---
const SideBar = React.memo(({ navItems, onSelect, isFocused, isOpen }) => {
    if (!isOpen) return null;
    return (
        <Box
            borderStyle={isFocused ? 'double' : 'single'}
            flexDirection="column"
            padding={1}
            width="25%"
            marginRight={1}
            minWidth={32}
        >
            <Text bold color="cyan">Menu</Text>
            <SelectInput items={navItems} onSelect={onSelect} isFocused={isFocused} />
        </Box>
    );
});

// --- GAME DETAILS TABLE ---
const GameDetailsTable = React.memo(({ game }) => {
    if (!game) return null;
    return (
        <Box
            flexDirection="column"
            padding={1}
            borderStyle="single"
            width="100%"
            marginTop={1}
        >
            <Text bold color="cyan">Game Details</Text>
            <Divider />
            <Box flexDirection="column">
                <Text><Text bold>ID:</Text> {game.id}</Text>
                <Text><Text bold>W/V:</Text> {game.numWerewolves}/{game.numPlayers - game.numWerewolves}</Text>
                <Text><Text bold>State:</Text> {game.state}</Text>
                <Text><Text bold>Role:</Text> {game.role}</Text>
                <Text><Text bold>Alive/Dead:</Text> {game.playersAlive}/{game.playersDead}</Text>
                <Text><Text bold>Players:</Text> {game.players.join(', ')}</Text>
            </Box>
        </Box>
    );
});

// --- MY GAMES LIST ---
const MyGames = React.memo(({ games, isFocused, onSelectGame, loading }) => {
    if (loading) {
        return (
            <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
                <Spinner type="dots" />
                <Text color="yellowBright" marginTop={1}>Loading games...</Text>
            </Box>
        );
    }
    return (
        <Box
            flexDirection="column"
            padding={2}
            borderStyle="single"
            flexGrow={1}
            width="100%"
            minHeight={0}
        >
            <Text bold color="cyan">My Games</Text>
            <Divider />
            <Box flexDirection="column" flexGrow={1} minHeight={0}>
                <SelectInput
                    items={games.map(game => ({ label: game.id, value: game.id }))}
                    onSelect={item => onSelectGame(games.find(g => g.id === item.value))}
                    isFocused={isFocused}
                />
            </Box>
            {isFocused && (
                <Box marginTop={1}>
                    <Text dimColor>Use ↑/↓ to navigate, Enter to select a game.</Text>
                </Box>
            )}
        </Box>
    );
});

// --- GAMEPLAY COMPONENT ---
const GamePlay = React.memo(
    ({ selectedGame, onAction, onVote, isFocused, wallet }) => {
        const [selectedOption, setSelectedOption] = useState(null);
        const playOptions = [
            { label: 'Kill', value: 'kill' },
            { label: 'Start Vote', value: 'start_vote' },
            { label: 'Skip Turn (attend to villager business)', value: 'skip' },
        ];
        const voteOptions = [
            ...selectedGame.players.map(player => ({ label: player, value: player })),
            { label: 'Skip Turn', value: 'skip' },
        ];
        const playForm = {
            sections: [
                {
                    fields: [
                        {
                            type: 'select',
                            name: 'action',
                            label: 'Choose an action:',
                            options: playOptions,
                            value: selectedOption ? [selectedOption] : [],
                            onChange: values => setSelectedOption(values[0]),
                        },
                    ],
                },
            ],
        };
        const voteForm = {
            sections: [
                {
                    fields: [
                        {
                            type: 'select',
                            name: 'vote',
                            label: 'Select a player to vote out:',
                            options: voteOptions,
                            value: selectedOption ? [selectedOption] : [],
                            onChange: values => setSelectedOption(values[0]),
                        },
                    ],
                },
            ],
        };
        useInput(
            (input, key) => {
                if (!isFocused || !selectedOption || key.return !== true) return;
                if (selectedGame.role === 'Werewolf') onAction(selectedOption);
                else onVote(selectedOption);
            },
            [isFocused, selectedOption, selectedGame.role, onAction, onVote],
        );
        return (
            <Box
                flexDirection="column"
                padding={2}
                borderStyle="single"
                flexGrow={1}
                width="100%"
                minHeight={0}
            >
                <Text bold color="cyan">Game Play</Text>
                <Divider />
                {selectedGame.state === 'Your turn' && (
                    <>
                        {selectedGame.role === 'Werewolf' ? (
                            <>
                                <Text bold color="yellow">Your Turn: Choose an Action</Text>
                                <Form form={playForm} isFocused={isFocused} />
                            </>
                        ) : (
                            <>
                                <Text bold color="yellow">Your Turn: Vote</Text>
                                <Form form={voteForm} isFocused={isFocused} />
                            </>
                        )}
                    </>
                )}
                {selectedGame.state === 'Waiting for others' && (
                    <Box flexDirection="column" alignItems="center" flexGrow={1} justifyContent="center">
                        <Text>Waiting for other players to finish their turn...</Text>
                        <Spinner type="dots" />
                    </Box>
                )}
                {selectedGame.state === 'Turn submitted' && (
                    <Box flexDirection="column" alignItems="center" flexGrow={1} justifyContent="center">
                        <Text>Your turn has been submitted!</Text>
                        <Text>Time remaining: 00:30</Text>
                    </Box>
                )}
            </Box>
        );
    },
);

// --- LOGS COMPONENT ---
const Logs = React.memo(({ games }) => {
    const allLogs = useMemo(
        () => games.flatMap(game => game.logs.map(log => ({ ...log, gameId: game.id }))),
        [games],
    );
    return (
        <Box
            flexDirection="column"
            padding={2}
            borderStyle="single"
            flexGrow={1}
            width="100%"
            minHeight={0}
        >
            <Text bold color="cyan">Game Logs</Text>
            <Divider />
            {allLogs.length === 0 ? (
                <Text>No logs yet.</Text>
            ) : (
                <Box flexDirection="column" flexGrow={1} minHeight={0} overflowY="scroll">
                    {allLogs.map((log, index) => (
                        <Box key={index} marginTop={1}>
                            <Text>
                                <Text bold>[Game {log.gameId}]</Text> {log.action} by {log.player}
                                {log.target && ` targeting ${log.target}`} ({log.status})
                            </Text>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
});

// --- GAME CREATION FORM ---
const GameCreation = React.memo(({ onCreate, isFocused, isCreating, wallet }) => {
    const form = {
        title: 'Create New Game',
        sections: [
            {
                title: 'Game Parameters',
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
                ],
            },
        ],
    };
    const onSubmit = async values => {
        if (!wallet) return;
        const werewolves = parseInt(values.numWerewolves);
        const numPlayers = values.addressList.split(',').length;
        if (werewolves >= numPlayers) {
            console.log('Number of werewolves must be less than the number of players.');
            return;
        }
        try {
            const signature = await wallet.signMessage(
                JSON.stringify({
                    addresses: values.addressList.split(',').map(addr => addr.trim()),
                    werewolves,
                }),
            );
            onCreate(
                values.addressList.split(',').map(addr => addr.trim()),
                werewolves,
                signature,
            );
        } catch (error) {
            console.error('Failed to sign game creation:', error);
        }
    };
    return (
        <Box
            flexDirection="column"
            padding={2}
            borderStyle="single"
            flexGrow={1}
            width="100%"
            minHeight={0}
        >
            {isCreating ? (
                <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
                    <Spinner type="dots" />
                    <Text color="yellowBright" marginTop={1}>Creating game... 🛠️</Text>
                </Box>
            ) : (
                <Form form={form} onSubmit={onSubmit} isFocused={isFocused} />
            )}
        </Box>
    );
});

// --- MAIN APP ---
export default function App() {
    const [currentNavItem, setCurrentNavItem] = useState('my_games');
    const [role, setRole] = useState(null);
    const [games, setGames] = useState([]);
    const [focusedSection, setFocusedSection] = useState('content');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedGame, setSelectedGame] = useState(null);
    const [isTerminalTooSmall, setIsTerminalTooSmall] = useState(false);
    const [loadingGames, setLoadingGames] = useState(false);
    const { exit } = useApp();
    const { wallet, signMessage, getEncryptKeyPair } = useWallet();

    useEffect(() => {
        const checkTerminalSize = () => {
            const { columns, rows } = process.stdout;
            setIsTerminalTooSmall(columns < 120 || rows < 38);
        };
        checkTerminalSize();
        process.stdout.on('resize', checkTerminalSize);
        return () => {
            process.stdout.off('resize', checkTerminalSize);
        };
    }, []);

    const loadGames = useCallback(async () => {
        if (!wallet) return;
        setLoadingGames(true);
        try {
            const gameIds = await getAllGamesForAddress(wallet.address);
            const gamePromises = gameIds.map(id => useZkWerewolfGame(id, wallet));
            const gameResults = await Promise.all(gamePromises.map(g => g.game));
            setGames(gameResults.filter(g => g));
        } catch (error) {
            console.error('Failed to load games:', error);
        } finally {
            setLoadingGames(false);
        }
    }, [wallet]);

    useEffect(() => {
        loadGames();
    }, [wallet, loadGames]);

    const onNavItemSelected = useCallback(
        item => {
            if (item.value === 'exit') exit();
            else {
                setCurrentNavItem(item.value);
                setFocusedSection('content');
                setIsMenuOpen(false);
            }
        },
        [exit],
    );

    const handleGameCreate = useCallback(
        async (addresses, werewolves, signature) => {
            setIsCreating(true);
            try {
                const gameId = await createGame({
                    adminPubKey: wallet.signingKey.publicKey,
                    playersPubKeys: addresses,
                    numPlayers: addresses.length,
                    noWerewolves: werewolves,
                });
                await loadGames();
            } catch (error) {
                console.error('Failed to create game:', error);
            } finally {
                setIsCreating(false);
            }
        },
        [wallet, loadGames],
    );

    const handleAction = useCallback(
        async action => {
            if (!selectedGame || !wallet) return;
            setIsSubmitting(true);
            try {
                if (action === 'kill') {
                    await useZkWerewolfGame(selectedGame.id, wallet).commitMove(selectedGame.id, ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['string'], ['kill'])));
                } else if (action === 'start_vote') {
                    await useZkWerewolfGame(selectedGame.id, wallet).startVote(selectedGame.id);
                }
                await loadGames();
            } catch (error) {
                console.error('Failed to perform action:', error);
            } finally {
                setIsSubmitting(false);
            }
        },
        [selectedGame, wallet, loadGames],
    );

    const handleVote = useCallback(
        async target => {
            if (!selectedGame || !wallet) return;
            setIsSubmitting(true);
            try {
                await useZkWerewolfGame(selectedGame.id, wallet).castVote(selectedGame.id, target);
                await loadGames();
            } catch (error) {
                console.error('Failed to cast vote:', error);
            } finally {
                setIsSubmitting(false);
            }
        },
        [selectedGame, wallet, loadGames],
    );

    const handleSelectGame = useCallback(
        (game) => {
            if (!game) return;
            setSelectedGame(game);
            setRole(game.role);
        },
        [setSelectedGame, setRole],
    );

    useInput(
        (input, key) => {
            if (input === 'm') {
                setIsMenuOpen(!isMenuOpen);
                setFocusedSection(isMenuOpen ? 'content' : 'sidebar');
            }
            if (key.tab && isMenuOpen) {
                setFocusedSection(prev => (prev === 'sidebar' ? 'content' : 'sidebar'));
            }
        },
        [isMenuOpen],
    );

    useEffect(() => {
        return () => {
            fs.writeFileSync('game_logs.json', JSON.stringify(gameLogs, null, 2));
        };
    }, []);

    if (isTerminalTooSmall) {
        return (
            <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                <Text color="red">
                    Please expand your terminal to at least 1380x700 for the best experience.
                </Text>
            </Box>
        );
    }

    return (
        <MainLayout wallet={wallet} selectedGame={selectedGame} currentNavItem={currentNavItem}>
            <SideBar
                navItems={[
                    { label: 'My Games', value: 'my_games' },
                    { label: 'Play Game', value: 'play_game' },
                    { label: 'Logs', value: 'logs' },
                    { label: 'Create Game', value: 'create' },
                    { label: 'Exit', value: 'exit' },
                ]}
                onSelect={onNavItemSelected}
                isFocused={focusedSection === 'sidebar'}
                isOpen={isMenuOpen}
            />
            <Box flexDirection="column" flexGrow={1} width="75%" minHeight={0}>
                {currentNavItem === 'my_games' && (
                    <>
                        <MyGames
                            games={games}
                            isFocused={focusedSection === 'content'}
                            onSelectGame={handleSelectGame}
                            loading={loadingGames}
                        />
                        {selectedGame && <GameDetailsTable game={selectedGame} />}
                    </>
                )}
                {currentNavItem === 'play_game' && selectedGame && (
                    <GamePlay
                        selectedGame={selectedGame}
                        onAction={handleAction}
                        onVote={handleVote}
                        isFocused={focusedSection === 'content'}
                        wallet={wallet}
                    />
                )}
                {currentNavItem === 'logs' && <Logs games={games} />}
                {currentNavItem === 'create' && (
                    <GameCreation
                        onCreate={handleGameCreate}
                        isFocused={focusedSection === 'content'}
                        isCreating={isCreating}
                        wallet={wallet}
                    />
                )}
            </Box>
        </MainLayout>
    );
}
