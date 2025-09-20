import {Box, Text} from 'ink';
import Divider from 'ink-divider';
import Spinner from 'ink-spinner';
import React, {useState} from 'react';

// --- PROOF PANEL ---
export function ProofPanel({pending}) {
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
