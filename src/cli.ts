#!/usr/bin/env node
import yargs from 'yargs';
import { printDependencyPaths } from './dep-path';

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
    'exclude-optional': {
      type: 'boolean',
      describe: 'Exclude optional dependencies',
      default: false,
    },
  })
  .example('real-ls lodash', 'find dependencies with package name "lodash"')
  .example('real-ls lodash@^4.3.0', 'find dependencies matching semver "lodash@^4.3.0"')
  .example('real-ls --exclude-dev lodash@^4.3.0', 'find "lodash@^4.3.0", while excluding dev dependencies')
  .demandCommand(1)
  .parseSync();

const packageName = argv._[0] as string;
const options = {
  json: argv.json,
  absolutePath: argv['absolute-path'],
  excludeDev: argv['exclude-dev'],
  excludePeer: argv['exclude-peer'],
  excludeOptional: argv['exclude-optional'],
};

printDependencyPaths(packageName, options);
