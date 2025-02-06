import chalk from 'chalk';
import { relative } from 'path';
import { printTree } from 'flexible-tree-printer';
import { TreeNode } from './dep-tree';
import { DependencyTreeLoader } from './dep-tree-loader';
import { parseSpecifier } from './npm';
import { TreeWalker } from './tree-walker';

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
  console.warn(chalk.gray('Building dependency tree...'));
  const tree = await new DependencyTreeLoader(options).loadDependency(cwd);
  const result: TreeNode[][] = [];
  console.warn(chalk.gray(`Matching ${specifier}...`));
  new TreeWalker().dfs(tree, (node, path) => {
    if (node.match(ref)) {
      result.push(path);
      return true;
    }
    return false;
  });
  return result;
}

export async function printDependencyPaths(
  specifier: string,
  options: FindDependencyPathsOptions,
): Promise<void> {
  const results = await findDependencyPaths(specifier, options);
  return options.json
    ? printJson(specifier, results, options)
    : printTrees(specifier, results, options);
}

function printTrees(specifier: string, results: TreeNode[][], options: PrintOptions) {
  if (!results.length) {
    console.error(chalk.red(`Dependency "${specifier}" not found.`));
    return;
  }
  console.log(chalk.green(`${results.length} path(s) found for "${specifier}"`));
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
  return console.log(JSON.stringify({ target, paths }, null, 4));
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
