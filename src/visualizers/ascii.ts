import { printTree } from 'flexible-tree-printer';
import chalk from 'chalk';
import { DependencyGraph } from '../dep-graph';
import { RealLSOptions } from '../options';
import { logger } from '../logger';
import { TreeNode } from '../tree-node';

export function handleASCII(G: DependencyGraph, options: RealLSOptions) {
  const results = G.getPathsWithLimit(options.maxPaths);
  const { specifier } = G;
  if (!results.length) logger.error(chalk.red(`Dependency "${specifier}" not found.`));
  else logger.infoErr(chalk.green(`${results.length} path(s) found for "${specifier}"`));

  printTrees(results);
  return results.length > 0;
}

function printTrees(results: TreeNode[][]) {
  for (const result of results) {
    printDependencyPath(result);
  }
}

function printDependencyPath(result: TreeNode[]) {
  type TreeObject = { [key: string]: TreeObject };

  const tree: TreeObject = {};
  let node = tree;

  for (const u of result) {
    node = node[u.toString()] = {};
  }

  printTree({ parentNode: tree });
}
