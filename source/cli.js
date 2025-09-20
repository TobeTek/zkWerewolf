#!/usr/bin/env node
import { withFullScreen } from 'fullscreen-ink';
import meow from 'meow';
import App from './app.js';

import React from 'react';
const _ReactConst = React;

const cli = meow(
	`
		Usage
		  $ 

		Options
			--name  Your name

		Examples
		  $  --name=Jane
		  Hello, Jane
	`,
	{
		importMeta: import.meta,
	},
);

// render(<App name={cli.flags.name} />);
withFullScreen(<App />).start();
