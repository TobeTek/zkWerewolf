import {Box, Text, useApp, useInput} from 'ink';
import BigText from 'ink-big-text';
import Divider from 'ink-divider';
import {Form} from 'ink-form';
import Gradient from 'ink-gradient';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Table} from '@tqman/ink-table';

// --- MOCK DATA ---
const mockGames = [
  {
    id: 'Game1',
    werewolves: 2,
    villagers: 4,
    state: 'Waiting for others',
    winner: null,
    role: 'Villager',
    playersAlive: 6,
    playersDead: 0,
    players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank'],
    logs: [],
  },
  {
    id: 'Game2',
    werewolves: 1,
    villagers: 3,
    state: 'Your turn',
    winner: null,
    role: 'Werewolf',
    playersAlive: 4,
    playersDead: 2,
    players: ['Alice', 'Bob', 'Charlie', 'Dave'],
    logs: [],
  },
  {
    id: 'Game3',
    werewolves: 2,
    villagers: 2,
    state: 'Game over',
    winner: 'Werewolves',
    role: 'Villager',
    playersAlive: 2,
    playersDead: 4,
    players: ['Alice', 'Bob'],
    logs: [],
  },
];

// --- NAVIGATION CONSTANTS ---
const getNavItems = (selectedGame, currentNavItem) => {
  const baseItems = [
    {label: 'My Games', value: 'my_games'},
    {label: 'Play Game', value: 'play_game'},
    {label: 'Logs', value: 'logs'},
    {label: 'Create Game', value: 'create'},
  ];
  baseItems.push({label: 'Exit', value: 'exit'});
  return baseItems;
};

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
const Header = React.memo(({publicKey, selectedGame, currentNavItem}) => (
  <Box flexDirection="column" alignItems="center" marginBottom={1}>
    <Box marginBottom={1}>
      <Gradient name="retro">
        <BigText text="zkWerewolf" font="simpleBlock" lineHeight={3} />
      </Gradient>
    </Box>
    <Box flexDirection="column" alignItems="center">
      <Text bold>Public Key: {publicKey}</Text>
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
));

// --- GENERAL LAYOUT ---
const MainLayout = React.memo(({children, publicKey, selectedGame, currentNavItem}) => (
  <Box flexDirection="column">
    <Header publicKey={publicKey} selectedGame={selectedGame} currentNavItem={currentNavItem} />
    <Box flexDirection="row" flexGrow={1}>
      {children}
    </Box>
    <HelpGuide />
  </Box>
));

// --- SIDEBAR ---
const SideBar = React.memo(({navItems, onSelect, isFocused, isOpen}) => {
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
      <SelectInput items={navItems} onSelect={onSelect} isFocused={isFocused} />
    </Box>
  );
});

// --- GAMEPLAY COMPONENT ---
const GamePlay = React.memo(({selectedGame, onAction, onVote, isFocused}) => {
  const [selectedOption, setSelectedOption] = useState(null);

  const playOptions = [
    {label: 'Kill', value: 'kill'},
    {label: 'Start Vote', value: 'start_vote'},
    {label: 'Attend to Villager Business', value: 'villager_business'},
    {label: 'Skip Turn', value: 'skip'},
  ];

  const voteOptions = [
    ...selectedGame.players.map(player => ({label: player, value: player})),
    {label: 'Skip Turn', value: 'skip'},
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
            onChange: (values) => setSelectedOption(values[0]),
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
            onChange: (values) => setSelectedOption(values[0]),
          },
        ],
      },
    ],
  };

  useInput(
    (input, key) => {
      if (!isFocused || !selectedOption || key.return !== true) return;
      if (selectedGame.role === 'Werewolf') {
        onAction(selectedOption);
      } else {
        onVote(selectedOption);
      }
    },
    [isFocused, selectedOption, selectedGame.role, onAction, onVote],
  );

  return (
    <Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1} width="100%">
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
        <Box flexDirection="column" alignItems="center">
          <Text>Waiting for other players to finish their turn...</Text>
          <Spinner type="dots" />
        </Box>
      )}
      {selectedGame.state === 'Turn submitted' && (
        <Box flexDirection="column" alignItems="center">
          <Text>Your turn has been submitted!</Text>
          <Text>Time remaining: 00:30</Text>
        </Box>
      )}
    </Box>
  );
});

// --- MY GAMES TABLE ---
const MyGames = React.memo(({games, isFocused, onSelectGame}) => {
  const data = useMemo(
    () =>
      games.map((game) => ({
        key: game.id,
        ID: game.id,
        'W/V': `${game.werewolves}/${game.villagers}`,
        State: game.state,
        'Winner/Role': game.winner || game.role,
      })),
    [games],
  );

  return (
    <Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1} width="100%">
      <Text bold color="cyan">My Games</Text>
      <Divider />
      <Box flexDirection="column">
        <Table data={data} />
      </Box>
      <Box marginTop={1}>
        <SelectInput
          items={games.map((game) => ({
            label: game.id,
            value: game.id,
          }))}
          onSelect={(item) => onSelectGame(games.find((g) => g.id === item.value))}
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

// --- LOGS COMPONENT ---
const Logs = React.memo(({games}) => {
  const allLogs = useMemo(
    () => games.flatMap(game => game.logs.map(log => ({...log, gameId: game.id}))),
    [games],
  );

  return (
    <Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1} width="100%">
      <Text bold color="cyan">Game Logs</Text>
      <Divider />
      {allLogs.length === 0 ? (
        <Text>No logs yet.</Text>
      ) : (
        allLogs.map((log, index) => (
          <Box key={index} marginTop={1}>
            <Text>
              <Text bold>[Game {log.gameId}]</Text> {log.action} by {log.player}
              {log.target && ` targeting ${log.target}`} ({log.status})
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
});

// --- GAME CREATION FORM ---
const GameCreation = React.memo(({onCreate, isFocused, isCreating}) => {
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
      values.addressList.split(',').map((addr) => addr.trim()),
      werewolves,
      villagers,
    );
  };

  return (
    <Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1} width="100%">
      {isCreating ? (
        <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
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
  const [games, setGames] = useState(mockGames);
  const [focusedSection, setFocusedSection] = useState('content');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [isTerminalTooSmall, setIsTerminalTooSmall] = useState(false);
  const publicKey = '0x1234...5678';
  const {exit} = useApp();

  // Check terminal size
  useEffect(() => {
    const checkTerminalSize = () => {
      const {columns, rows} = process.stdout;
      setIsTerminalTooSmall(columns < 80 || rows < 24);
    };
    checkTerminalSize();
    process.stdout.on('resize', checkTerminalSize);
    return () => {
      process.stdout.off('resize', checkTerminalSize);
    };
  }, []);

  const onNavItemSelected = useCallback(
    (item) => {
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
    (addresses, werewolves, villagers) => {
      setIsCreating(true);
      setTimeout(() => {
        const newGame = {
          id: `Game${games.length + 1}`,
          werewolves,
          villagers,
          state: 'Waiting for others',
          winner: null,
          role: 'Villager',
          playersAlive: werewolves + villagers,
          playersDead: 0,
          players: addresses,
          logs: [],
        };
        setGames([...games, newGame]);
        setIsCreating(false);
      }, 2000);
    },
    [games],
  );

  const handleAction = useCallback(
    (action) => {
      setIsSubmitting(true);
      setGames(prevGames =>
        prevGames.map(game =>
          game.id === selectedGame.id
            ? {
                ...game,
                logs: [...game.logs, {action, player: 'You', target: null, status: 'proof pending'}],
              }
            : game,
        ),
      );
      setTimeout(() => {
        setGames(prevGames =>
          prevGames.map(game =>
            game.id === selectedGame.id
              ? {
                  ...game,
                  state: 'Turn submitted',
                  logs: game.logs.map((log, i) =>
                    i === game.logs.length - 1 ? {...log, status: 'verified'} : log,
                  ),
                }
              : game,
          ),
        );
        setIsSubmitting(false);
      }, 2000);
    },
    [selectedGame, setIsSubmitting, setGames],
  );

  const handleVote = useCallback(
    (target) => {
      setIsSubmitting(true);
      setGames(prevGames =>
        prevGames.map(game =>
          game.id === selectedGame.id
            ? {
                ...game,
                logs: [...game.logs, {action: 'vote', player: 'You', target, status: 'proof pending'}],
              }
            : game,
        ),
      );
      setTimeout(() => {
        setGames(prevGames =>
          prevGames.map(game =>
            game.id === selectedGame.id
              ? {
                  ...game,
                  state: 'Turn submitted',
                  logs: game.logs.map((log, i) =>
                    i === game.logs.length - 1 ? {...log, status: 'verified'} : log,
                  ),
                }
              : game,
          ),
        );
        setIsSubmitting(false);
      }, 2000);
    },
    [selectedGame, setIsSubmitting, setGames],
  );

  const handleSelectGame = useCallback(
    (game) => {
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

  if (isTerminalTooSmall) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
        <Text color="red">Please expand your terminal size to full-screen for the best experience. (1680x682)</Text>
      </Box>
    );
  }

  return (
    <MainLayout publicKey={publicKey} selectedGame={selectedGame} currentNavItem={currentNavItem}>
      <SideBar
        navItems={getNavItems(selectedGame, currentNavItem)}
        onSelect={onNavItemSelected}
        isFocused={focusedSection === 'sidebar'}
        isOpen={isMenuOpen}
      />
      <Box flexDirection="column" flexGrow={1} width="100%">
        {currentNavItem === 'my_games' && (
          <MyGames
            games={games}
            isFocused={focusedSection === 'content'}
            onSelectGame={handleSelectGame}
          />
        )}
        {currentNavItem === 'play_game' && selectedGame && (
          <GamePlay
            selectedGame={selectedGame}
            onAction={handleAction}
            onVote={handleVote}
            isFocused={focusedSection === 'content'}
          />
        )}
        {currentNavItem === 'logs' && <Logs games={games} />}
        {currentNavItem === 'create' && (
          <GameCreation
            onCreate={handleGameCreate}
            isFocused={focusedSection === 'content'}
            isCreating={isCreating}
          />
        )}
      </Box>
    </MainLayout>
  );
}
