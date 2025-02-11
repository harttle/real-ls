import chalk from 'chalk';
import svg2img from 'svg2img';
import { instance } from '@viz-js/viz';
import { writeFileSync } from 'fs';
import { printTree } from 'flexible-tree-printer';
import { TreeNode } from './tree-node';
import { DependencyTreeLoader } from './dep-tree-loader';
import { parseSpecifier } from './npm';
import { logger } from './logger';
import { FindDependencyPathsOptions, FormatOption } from './options';
import { DependencyGraph } from './dep-graph';

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

export async function printDependencyPaths(
  specifier: string,
  options: FindDependencyPathsOptions,
): Promise<boolean> {
  const graph = new DependencyGraph();
  if (options.format === FormatOption.dot) {
    const G = await graph.createDependencyGraph(specifier, options);
    const str = createDOT(G);
    process.stdout.write(str);
    return G.size > 0;
  }
  if (options.format === FormatOption.svg) {
    const G = await graph.createDependencyGraph(specifier, options);
    if (!G.size) return false;
    const dot = createDOT(G);
    const viz = await instance();
    const svg = viz.renderString(dot, { format: 'svg' });
    const outputFile = options.output ?? 'dep.svg';
    writeFileSync(outputFile, svg);
    console.info(`SVG saved to ${outputFile}`);
    return true;
  }
  if (options.format === FormatOption.png) {
    const G = await graph.createDependencyGraph(specifier, options);
    if (!G.size) return false;
    const dot = createDOT(G);
    drawPNG(dot, options.output ?? 'dep.png');
    return true;
  }

  const results = await findDependencyPaths(specifier, options);
  if (!results.length) logger.error(chalk.red(`Dependency "${specifier}" not found.`));
  else logger.infoErr(chalk.green(`${results.length} path(s) found for "${specifier}"`));
  if (options.format === FormatOption.json) printJson(specifier, results);
  else printTrees(results);
  return results.length > 0;
}

function printTrees(results: TreeNode[][]) {
  for (const result of results) {
    printDependencyPath(result);
  }
}

function printJson(target: string, results: TreeNode[][]) {
  const paths = results.map((path) => path.map((node) => ({
    name: node.name,
    version: node.version,
    directory: node.getDirectory(),
  })));
  return process.stdout.write(`${JSON.stringify({ target, paths }, null, 4)}\n`);
}

function createDOT(G: Map<TreeNode, TreeNode[]>) {
  const D = [...G.keys()].reduce((prev, curr) => Math.max(prev, curr.depth), 0) + 1;
  const nodeByRank: TreeNode[][] = Array(D).fill(0).map((_) => []);
  for (const node of G.keys()) {
    nodeByRank[node.depth].push(node);
  }
  const ranks: string[] = [];
  for (const nodes of nodeByRank.values()) {
    const list = nodes.map((x: TreeNode) => `"${x}";`).join(' ');
    ranks.push(`{ rank=same; ${list} }`);
  }

  const colors: string[] = [];
  for (const [u, children] of G) {
    if (children.length) continue;
    colors.push(`"${u}" [color=red fontcolor=red]`);
  }

  const edgeStrings: string[] = [];
  for (const [u, edges] of G) {
    for (const v of edges) {
      edgeStrings.push(`"${u}" -> "${v}"`);
    }
  }
  return `digraph G {
    rankdir=LR;
    ${ranks.join('\n')}
    ${colors.join('\n')}
    ${edgeStrings.join('\n')}
  }`;
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
