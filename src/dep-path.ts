import chalk from 'chalk';
import svg2img from 'svg2img';
import { instance } from '@viz-js/viz';
import { relative } from 'path';
import { writeFileSync } from 'fs';
import { printTree } from 'flexible-tree-printer';
import { TreeNode } from './tree-node';
import { DependencyTreeLoader } from './dep-tree-loader';
import { parseSpecifier } from './npm';
import { logger } from './logger';

const CWD = process.cwd();

const enum FormatOption {
  json = 'json',
  ascii = 'ascii',
  dot = 'dot',
  svg = 'svg',
  png = 'png',
}

const enum PathOption {
  none = 'none',
  absolute = 'absolute',
  relative = 'relative',
}

interface PrintOptions {
  format?: string;
  path?: string;
  // limit paths
  maxPaths?: number;
  // current working directory
  cwd?: string;
}

interface FindDependencyPathsOptions extends PrintOptions {
  excludeDev?: boolean;
  excludePeer?: boolean;
  excludeOptional?: boolean;
  output?: string;
}

type TreeObject = { [key: string]: TreeObject };

export async function findDependencyPaths(specifier: string, options: FindDependencyPathsOptions) {
  const ref = parseSpecifier(specifier);
  const cwd = options.cwd ?? process.cwd();

  logger.infoErr(chalk.gray('Building dependency tree...'));
  const tree = await new DependencyTreeLoader(options).loadDependency(cwd);

  logger.infoErr(chalk.gray(`Matching "${specifier}"...`));
  const found: Map<TreeNode, TreeNode[][]> = new Map();
  const maxPaths = options.maxPaths ?? 1024;

  const dfs = (node: TreeNode, stack: Set<TreeNode>): TreeNode[][] => {
    if (found.has(node)) return found.get(node)!;
    if (node.match(ref)) return [[node]];
    if (stack.has(node)) return [];
    stack.add(node);
    const paths: TreeNode[][] = [];
    for (const child of node.children) {
      for (const path of dfs(child, stack)) {
        if (paths.length >= maxPaths) break;
        paths.push([node, ...path]);
      }
    }
    stack.delete(node);
    found.set(node, paths);
    return paths;
  };
  return dfs(tree, new Set());
}

export async function createDependencyGraph(specifier: string, options: FindDependencyPathsOptions) {
  const ref = parseSpecifier(specifier);
  const cwd = options.cwd ?? process.cwd();

  logger.infoErr(chalk.gray('Building dependency tree...'));
  const tree = await new DependencyTreeLoader(options).loadDependency(cwd);

  logger.infoErr(chalk.gray(`Matching "${specifier}"...`));
  const G: Map<TreeNode, TreeNode[] | null> = new Map();

  const dfs = (node: TreeNode, path: Set<TreeNode>): boolean => {
    if (G.has(node)) return !!G.get(node);
    if (node.match(ref)) {
      G.set(node, []);
      return true;
    }
    if (path.has(node)) return false;

    path.add(node);
    const children = node.children.filter((curr) => dfs(curr, path));
    path.delete(node);

    if (children.length) {
      G.set(node, children);
      return true;
    }
    G.set(node, null);
    return false;
  };
  dfs(tree, new Set());

  for (const [k, v] of G) if (v == null) G.delete(k);
  return G as Map<TreeNode, TreeNode[]>;
}

export async function printDependencyPaths(
  specifier: string,
  options: FindDependencyPathsOptions,
): Promise<boolean> {
  if (options.format === FormatOption.dot) {
    const G = await createDependencyGraph(specifier, options);
    const str = createDOT(G, options);
    process.stdout.write(str);
    return G.size > 0;
  }
  if (options.format === FormatOption.svg) {
    const G = await createDependencyGraph(specifier, options);
    if (!G.size) return false;
    const dot = createDOT(G, options);
    const viz = await instance();
    const svg = viz.renderString(dot, { format: 'svg' });
    const outputFile = options.output ?? 'dep.svg';
    writeFileSync(outputFile, svg);
    console.info(`SVG saved to ${outputFile}`);
    return true;
  }
  if (options.format === FormatOption.png) {
    const G = await createDependencyGraph(specifier, options);
    if (!G.size) return false;
    const dot = createDOT(G, options);
    drawPNG(dot, options.output ?? 'dep.png');
    return true;
  }

  const results = await findDependencyPaths(specifier, options);
  if (!results.length) logger.error(chalk.red(`Dependency "${specifier}" not found.`));
  else logger.infoErr(chalk.green(`${results.length} path(s) found for "${specifier}"`));
  if (options.format === FormatOption.json) printJson(specifier, results, options);
  else printTrees(results, options);
  return results.length > 0;
}

function printTrees(results: TreeNode[][], options: PrintOptions) {
  for (const result of results) {
    printDependencyPath(result, options);
  }
}

function printJson(target: string, results: TreeNode[][], options: PrintOptions) {
  const paths = results.map((path) => path.map((node) => ({
    name: node.name,
    version: node.version,
    directory: getDirectory(node.directory, options),
  })));
  return process.stdout.write(`${JSON.stringify({ target, paths }, null, 4)}\n`);
}

function createDOT(G: Map<TreeNode, TreeNode[]>, options: PrintOptions) {
  const serialize = (u: TreeNode) => {
    const dir = getDirectory(u.directory, options);
    const dirStr = dir ? ` (${dir})` : '';
    return `"${u.name}${dirStr}"`;
  };
  const D = [...G.keys()].reduce((prev, curr) => Math.max(prev, curr.depth), 0) + 1;
  const nodeByRank: TreeNode[][] = Array(D).fill(0).map((_) => []);
  for (const node of G.keys()) {
    nodeByRank[node.depth].push(node);
  }
  const ranks: string[] = [];
  for (const nodes of nodeByRank.values()) {
    const list = nodes.map((x: TreeNode) => `${serialize(x)};`).join(' ');
    ranks.push(`{ rank=same; ${list} }`);
  }

  const edgeStrings: string[] = [];
  for (const [u, edges] of G) {
    const su = serialize(u);
    for (const v of edges) {
      const sv = serialize(v);
      edgeStrings.push(`${su} -> ${sv}`);
    }
  }
  return `digraph G {\n${ranks.join('\n')}\n${edgeStrings.join('\n')}\n}`;
}

function getDirectory(dir: string, options: PrintOptions): string | undefined {
  if (options.path === PathOption.absolute) return dir;
  if (options.path === PathOption.relative) {
    const cwd = options.cwd ?? CWD;
    return `./${relative(cwd, dir)}`;
  }
  return undefined;
}

function printDependencyPath(result: TreeNode[], options: PrintOptions) {
  const tree: TreeObject = {};
  let node = tree;

  for (let i = 0; i < result.length; i++) {
    const pkg = result[i];
    const directory = getDirectory(pkg.directory, options) ?? '';
    const directoryStr = directory ? ` ${chalk.gray(directory)}` : '';
    const entry = `${pkg.name}@${pkg.version}${directoryStr}`;
    node = node[entry] = {};
  }

  printTree({ parentNode: tree });
}

async function drawPNG(dot: string, outputFile = 'dep.png') {
  const viz = await instance();
  const svg = viz.renderString(dot, { format: 'svg' });
  return new Promise<void>((resolve, reject) => {
    svg2img(svg, { format: 'png' as any, quality: 1000 }, (error, buffer) => {
      if (error) return reject(error);
      writeFileSync(outputFile, buffer);
      console.info(`PNG saved to ${outputFile}`);
      return resolve();
    });
  });
}
