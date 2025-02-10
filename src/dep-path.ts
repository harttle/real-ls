import chalk from 'chalk';
import { relative } from 'path';
import { printTree } from 'flexible-tree-printer';
import { TreeNode } from './tree-node';
import { DependencyTreeLoader } from './dep-tree-loader';
import { parseSpecifier } from './npm';
import { logger } from './logger';

interface PrintOptions {
  // use absolute path instead of relative
  absolutePath?: boolean;
  // current working directory
  cwd?: string;
}

interface FindDependencyPathsOptions extends PrintOptions {
  // for the entry package, exclude dev dependencies
  excludeDev?: boolean;
  // for each recursive package, exclude peer dependencies
  excludePeer?: boolean;
  // for each package, exclude optional dependencies
  excludeOptional?: boolean;
  // print the dependencies in json format
  json?: boolean;
}

type TreeObject = { [key: string]: TreeObject };

export async function findDependencyPaths(specifier: string, options: FindDependencyPathsOptions) {
  const ref = parseSpecifier(specifier);
  const cwd = options.cwd ?? process.cwd();

  logger.infoErr(chalk.gray('Building dependency tree...'));
  const tree = await new DependencyTreeLoader(options).loadDependency(cwd);

  logger.infoErr(chalk.gray(`Matching "${specifier}"...`));
  const found: Map<TreeNode, TreeNode[][]> = new Map();

  const dfs = (node: TreeNode, stack: Set<TreeNode>): TreeNode[][] => {
    if (found.has(node)) return found.get(node)!;
    if (node.match(ref)) return [[node]];
    if (stack.has(node)) return [];
    stack.add(node);
    const paths: TreeNode[][] = [];
    for (const child of node.children) {
      paths.push(...dfs(child, stack).map((path: TreeNode[]) => [node, ...path]));
    }
    stack.delete(node);
    found.set(node, paths);
    return paths;
  };
  return dfs(tree, new Set());
}

export async function printDependencyPaths(
  specifier: string,
  options: FindDependencyPathsOptions,
): Promise<boolean> {
  const results = await findDependencyPaths(specifier, options);

  if (!results.length) logger.error(chalk.red(`Dependency "${specifier}" not found.`));
  else logger.infoErr(chalk.green(`${results.length} path(s) found for "${specifier}"`));
  if (options.json) printJson(specifier, results, options);
  else printTrees(results, options);
  return results.length > 0;
}

function printTrees(results: TreeNode[][], options: PrintOptions) {
  for (const result of results) {
    printDependencyPath(result, options);
  }
}

function printJson(target: string, results: TreeNode[][], options: PrintOptions) {
  const cwd = options.cwd ?? process.cwd();
  const paths = results.map((path) => path.map((node) => ({
    name: node.name,
    version: node.version,
    directory: options.absolutePath ? node.directory : `./${relative(cwd, node.directory)}`,
  })));
  return process.stdout.write(`${JSON.stringify({ target, paths }, null, 4)}\n`);
}

function printDependencyPath(result: TreeNode[], options: PrintOptions) {
  const tree: TreeObject = {};
  let node = tree;
  const cwd = options.cwd ?? process.cwd();

  for (let i = 0; i < result.length; i++) {
    const pkg = result[i];
    const directory = options.absolutePath ? pkg.directory : `./${relative(cwd, pkg.directory)}`;
    const entry = `${pkg.name}@${pkg.version} ${chalk.gray(directory)}`;
    node = node[entry] = {};
  }

  printTree({ parentNode: tree });
}
