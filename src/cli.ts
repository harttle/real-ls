#!/usr/bin/env node
import yargs from 'yargs';
import chalk from 'chalk';
import { printDependencyPaths } from './dep-path';
import { LogLevel, logger } from './logger';

// disable colors in non-interactive shell
if (!process.stdout.isTTY) chalk.level = 0;

const argv = yargs
  .usage('Usage: $0 <package> [options]')
  .positional('package', {
    describe: 'Package specifier of the dependency to be found',
    type: 'string',
  })
  .options({
    format: {
      type: 'string',
      default: 'ascii',
      describe: 'Output format',
      choices: ['ascii', 'json', 'dot', 'png', 'svg'],
    },
    output: {
      type: 'string',
      describe: 'Output file name',
    },
    path: {
      type: 'string',
      describe: 'How to show directory path of each package',
      default: 'none',
      choices: ['none', 'absolute', 'relative'],
    },
    'max-paths': {
      type: 'number',
      describe: 'Limit paths to be printed, as there can be exponential number of paths',
      default: 1024,
    },
    'exclude-dev': {
      type: 'boolean',
      describe: 'Exclude dev dependencies for root, deep dev dependencies are always excluded',
      default: false,
    },
    'exclude-peer': {
      type: 'boolean',
      describe: 'Exclude peer dependencies',
      default: true,
    },
    'exclude-optional': {
      type: 'boolean',
      describe: 'Exclude optional dependencies',
      default: false,
    },
    verbose: {
      type: 'boolean',
      describe: 'print additional log',
      default: false,
    },
    silent: {
      type: 'boolean',
      describe: 'print results only',
      default: false,
    },
  })
  .example('real-ls lodash', 'find dependencies with package name "lodash"')
  .example('real-ls lodash@^4.3.0', 'find dependencies matching semver "lodash@^4.3.0"')
  .example('real-ls --exclude-dev lodash@^4.3.0', 'find "lodash@^4.3.0", while excluding dev dependencies')
  .demandCommand(1)
  .parseSync();

const packageName = argv._[0] as string;

if (argv.verbose) logger.level = LogLevel.Log;
else if (argv.silent) logger.level = LogLevel.Error;

printDependencyPaths(packageName, argv).then((success) => {
  if (!success) process.exit(1);
});
