import chalk from 'chalk';
import { DependencyGraph } from '../dep-graph';
import { RealLSOptions } from '../options';
import { TreeNode } from '../tree-node';
import { logger } from '../logger';

export function handleJSON(G: DependencyGraph, options: RealLSOptions) {
  const results = G.getPathsWithLimit(options.maxPaths);
  const { specifier } = G;
  if (!results.length) logger.error(chalk.red(`Dependency "${specifier}" not found.`));
  else logger.infoErr(chalk.green(`${results.length} path(s) found for "${specifier}"`));

  printJson(specifier, results);
  return results.length > 0;
}

function printJson(target: string, results: TreeNode[][]) {
  const paths = results.map((path) => path.map((node) => ({
    name: node.name,
    version: node.version,
    directory: node.getDirectory(),
  })));
  return process.stdout.write(`${JSON.stringify({ target, paths }, null, 4)}\n`);
}
