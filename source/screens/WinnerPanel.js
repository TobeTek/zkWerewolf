import {Box, Text} from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import React, {useState} from 'react';

// --- WINNER PANEL ---
export function WinnerPanel({winner}) {
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
