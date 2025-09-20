import {Box, Text, useApp, useInput} from 'ink';
import BigText from 'ink-big-text';
import Divider from 'ink-divider';
import Gradient from 'ink-gradient';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import {Form} from 'ink-form';
import {Table} from '@tqman/ink-table';
import React, {useState, useCallback, useMemo, useEffect} from 'react';

// --- MOCK DATA ---
const mockGames = [
  {id: 'Game1', werewolves: 2, villagers: 4, state: 'Waiting for others', winner: null, role: 'Villager', playersAlive: 6, playersDead: 0},
  {id: 'Game2', werewolves: 1, villagers: 3, state: 'Your turn', winner: null, role: 'Werewolf', playersAlive: 4, playersDead: 2},
  {id: 'Game3', werewolves: 2, villagers: 2, state: 'Game over', winner: 'Werewolves', role: 'Villager', playersAlive: 2, playersDead: 4},
];

// --- NAVIGATION CONSTANTS ---
const getNavItems = (selectedGame) => {
  const baseItems = [
    {label: 'My Games', value: 'my_games'},
    {label: 'Create Game', value: 'create'},
  ];
  if (selectedGame) {
    baseItems.push(
      {label: 'Play Turn 🎮', value: 'play_turn'},
      {label: 'Vote 🗳️', value: 'vote'},
    );
  }
  baseItems.push({label: 'Exit', value: 'exit'});
  return baseItems;
};

// --- HELP GUIDE/KEY MAP FOOTER ---
const HelpGuide = React.memo(() => {
  return (
    <Box marginTop={1} borderStyle="round" padding={1}>
      <Text color="gray">
        <Text bold>Navigation:</Text> Press <Text bold>M</Text> to open/close menu, ↑/↓ (navigate), Enter (select)
      </Text>
      <Text color="gray">
        <Text bold>Gameplay:</Text> k (kill), v (vote), s (skip)
      </Text>
    </Box>
  );
});

// --- HEADER ---
const Header = React.memo(({publicKey, selectedGame}) => {
  return (
    <Box flexDirection="column" alignItems="center" marginBottom={1}>
      <Box marginBottom={1}>
        <Gradient name="retro">
          <BigText text="zkWerewolf" font="simpleBlock" lineHeight={3} />
        </Gradient>
      </Box>
      <Box flexDirection="column" alignItems="center">
        <Text bold>Public Key: {publicKey}</Text>
        {selectedGame && (
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
});


// --- GENERAL LAYOUT ---
const MainLayout = React.memo(({children, publicKey, selectedGame}) => {
  return (
    <Box flexDirection="column">
      <Header publicKey={publicKey} selectedGame={selectedGame} />
      <Box flexDirection="row" flexGrow={1}>
        {children}
      </Box>
      <HelpGuide />
    </Box>
  );
});

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

// --- MY GAMES TABLE ---
const MyGames = React.memo(({games, isFocused, onSelectGame, selectedGameId}) => {
  const data = useMemo(() => {
    return games.map(game => ({
      key: game.id,
      ID: game.id,
      'W/V': `${game.werewolves}/${game.villagers}`,
      State: game.state,
      'Winner/Role': game.winner || game.role,
    }));
  }, [games]);

  return (
    <Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1} width="100%">
      <Text bold color="cyan">My Games</Text>
      <Divider />
      <Box flexDirection="column">
        <Table data={data} />
      </Box>
      <Box marginTop={1}>
        <SelectInput
          items={games.map(game => ({
            label: game.id,
            value: game.id,
          }))}
          onSelect={(item) => onSelectGame(games.find(g => g.id === item.value))}
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

// --- GAME CREATION FORM ---
const GameCreation = React.memo(({onCreate, isFocused, isCreating}) => {
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

// --- PLAY TURN ---
const PlayTurn = React.memo(({role, onAction, isFocused, isSubmitting}) => {
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
    <Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1} width="100%">
      {isSubmitting ? (
        <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
          <Spinner type="dots" />
          <Text color="yellowBright" marginTop={1}>Submitting turn... ⏳</Text>
        </Box>
      ) : (
        <>
          <Gradient name="morning">
            <BigText text="Play Turn" font="tiny" />
          </Gradient>
          <Text color="yellowBright">
            Your role: {role || 'Hidden (will be privately revealed)'}
          </Text>
          <Divider />
          <Text>Choose Action (k=Kill, v=Vote, s=Skip):</Text>
          {role === 'Werewolf' && (
            <Box>
              <Text>Target to kill:</Text>
              <TextInput value={target} onChange={setTarget} isFocused={isFocused} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
});

// --- VOTE UI ---
const VoteUI = React.memo(({onVote, isFocused, isSubmitting}) => {
  const [target, setTarget] = useState('');

  useInput(
    (input, key) => {
      if (!isFocused) return;
      if (key.return) onVote(target);
    },
    {isActive: isFocused},
  );

  return (
    <Box flexDirection="column" padding={2} borderStyle="single" flexGrow={1} width="100%">
      {isSubmitting ? (
        <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
          <Spinner type="dots" />
          <Text color="yellowBright" marginTop={1}>Submitting vote... 🗳️</Text>
        </Box>
      ) : (
        <>
          <Gradient name="morning">
            <BigText text="Vote" font="tiny" />
          </Gradient>
          <Text>Select a player to vote out:</Text>
          <TextInput value={target} onChange={setTarget} isFocused={isFocused} />
          <Text dimColor marginTop={1}>Press Enter to submit your vote.</Text>
        </>
      )}
    </Box>
  );
});

// --- GAME OVER ---
const GameOver = React.memo(({winner}) => {
  return (
    <Box flexDirection="column" padding={2} borderStyle="double" flexGrow={1} width="100%">
      <Gradient name="pastel">
        <BigText text="GAME OVER" font="tiny" />
      </Gradient>
      <Text color="greenBright">
        {winner ? `Winner: ${winner} 🏆` : 'Calculating winner...'}
      </Text>
    </Box>
  );
});

// --- MAIN APP ---
export default function App() {
  const [currentNavItem, setCurrentNavItem] = useState(getNavItems(null)[0]);
  const [role, setRole] = useState(null);
  const [history, setHistory] = useState([]);
  const [winner, setWinner] = useState(null);
  const [games, setGames] = useState(mockGames);
  const [focusedSection, setFocusedSection] = useState('content');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const publicKey = '0x1234...5678';
  const {exit} = useApp();

  const onNavItemSelected = useCallback((item) => {
    if (item.value === 'exit') exit();
    else {
      setCurrentNavItem(item);
      setFocusedSection('content');
      setIsMenuOpen(false);
    }
  }, [exit]);

  const handleGameCreate = useCallback((addresses, werewolves, villagers) => {
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
      };
      setGames([...games, newGame]);
      setIsCreating(false);
      setCurrentNavItem(getNavItems(null)[0]);
    }, 2000);
  }, [games]);

  const handleAction = useCallback((action, target) => {
    setIsSubmitting(true);
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
      setIsSubmitting(false);
    }, 2000);
  }, []);

  const handleVote = useCallback((target) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setWinner('Villagers');
    }, 2000);
  }, []);

  const handleSelectGame = useCallback((game) => {
    setSelectedGame(game);
    setRole(game.role);
    setCurrentNavItem(getNavItems(game)[0]);
  }, []);

  useInput((input, key) => {
    if (input === 'm') {
      setIsMenuOpen(!isMenuOpen);
      setFocusedSection(isMenuOpen ? 'content' : 'sidebar');
    }
    if (key.tab && isMenuOpen) {
      setFocusedSection(prev => (prev === 'sidebar' ? 'content' : 'sidebar'));
    }
  });

  return (
    <MainLayout publicKey={publicKey} selectedGame={selectedGame}>
      <SideBar
        navItems={getNavItems(selectedGame)}
        onSelect={onNavItemSelected}
        isFocused={focusedSection === 'sidebar'}
        isOpen={isMenuOpen}
      />
      <Box flexDirection="column" flexGrow={1} width="100%">
        {currentNavItem.value === 'my_games' && (
          <MyGames
            games={games}
            isFocused={focusedSection === 'content'}
            onSelectGame={handleSelectGame}
            selectedGameId={selectedGame?.id}
          />
        )}
        {currentNavItem.value === 'create' && (
          <GameCreation
            onCreate={handleGameCreate}
            isFocused={focusedSection === 'content'}
            isCreating={isCreating}
          />
        )}
        {currentNavItem.value === 'play_turn' && selectedGame && (
          <PlayTurn
            role={role}
            onAction={handleAction}
            isFocused={focusedSection === 'content'}
            isSubmitting={isSubmitting}
          />
        )}
        {currentNavItem.value === 'vote' && selectedGame && (
          <VoteUI
            onVote={handleVote}
            isFocused={focusedSection === 'content'}
            isSubmitting={isSubmitting}
          />
        )}
        {selectedGame?.state === 'Game over' && (
          <GameOver winner={winner} />
        )}
      </Box>
    </MainLayout>
  );
}
