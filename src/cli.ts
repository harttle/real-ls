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
    json: {
      type: 'boolean',
      default: false,
      describe: 'Output in JSON format',
    },
    'max-paths': {
      type: 'number',
      describe: 'Limit paths to be printed, as there can be exponential number of paths',
      default: 1024,
    },
    'exclude-dev': {
      type: 'boolean',
      describe: 'Exclude dev dependencies',
      default: false,
    },
    'exclude-peer': {
      type: 'boolean',
      describe: 'Exclude peer dependencies',
      default: false,
    },
    'absolute-path': {
      type: 'boolean',
      describe: 'Use absolute package path instead of relative',
      default: false,
    },
    'disable-path': {
      type: 'boolean',
      describe: 'Show no path of packages',
      default: false,
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
