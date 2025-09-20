import {Box} from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import React from 'react';

// --- HEADER ---
export function Header() {
	return (
		<Box marginBottom={1} alignSelf="center">
			<Gradient name="retro">
				<BigText text="zkWerewolf" font="simpleBlock" />
			</Gradient>
		</Box>
	);
}
