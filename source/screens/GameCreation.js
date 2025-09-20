import {Box} from 'ink';
import {Form} from 'ink-form';
import React, {useState} from 'react';

// --- GAME CREATION FORM ---
export function GameCreation({onCreate, isFocused}) {
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
						description:
							'Enter the wallet addresses of the players, separated by commas.',
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
						description:
							'Total players (Werewolves + Villagers) must be 6 or less.',
					},
				],
			},
		],
	};

	const onSubmit = values => {
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
			<Form form={form} onSubmit={onSubmit} isFocused={isFocused} />
		</Box>
	);
}
