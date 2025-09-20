#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { withFullScreen } from 'fullscreen-ink';
import meow from 'meow';
import App from './app.js';

// dotenv.config({path: '../.env'});
dotenv.config();

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
