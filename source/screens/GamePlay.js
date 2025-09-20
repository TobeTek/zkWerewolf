import { Box, Text, useInput } from 'ink';
import BigText from 'ink-big-text';
import Divider from 'ink-divider';
import Gradient from 'ink-gradient';
import TextInput from 'ink-text-input';
import React, {useState} from 'react';

// --- GAMEPLAY ACTIONS ---
export function GamePlay({role, onAction, isFocused}) {
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