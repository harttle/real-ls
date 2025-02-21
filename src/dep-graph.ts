import chalk from 'chalk';
import { DependencyTreeLoader } from './dep-tree-loader';
import { DependencyReference, parseSpecifier } from './npm';
import { RealLSOptions } from './options';
import { TreeNode } from './tree-node';
import { logger } from './logger';

export class DependencyGraph {
  roots: TreeNode[];
  nodes: Set<TreeNode>;
  specifier: string;

  constructor(specifier: string, roots: TreeNode[]) {
    this.specifier = specifier;
    this.roots = roots;
    this.nodes = this.getAllNodes();
    this.markOrderForDuplicates();
  }

  get size() {
    return this.nodes.size;
  }

  private getAllNodes(): Set<TreeNode> {
    const nodes: Set<TreeNode> = new Set();
    for (const root of this.roots) {
      for (const node of DependencyGraph.getNodes(root)) nodes.add(node);
    }
    return nodes;
  }

  getPathsWithLimit(limit = 1024) {
    const paths = [];
    for (const path of this.getAllPaths()) {
      paths.push(path);
      if (paths.length >= limit) return paths;
    }
    return paths;
  }

  * getAllPaths(): IterableIterator<TreeNode[]> {
    for (const root of this.roots) yield* this.getPaths(root);
  }

  * getPaths(node: TreeNode, stack: TreeNode[] = []): IterableIterator<TreeNode[]> {
    stack.push(node);
    if (node.isTarget) yield [...stack];
    else for (const child of node.children) yield* this.getPaths(child, stack);
    stack.pop();
  }

  static markTargets(root: TreeNode, ref: DependencyReference) {
    if (root.isTarget !== undefined) return;
    root.isTarget = root.match(ref);

    for (const child of root.children) {
      DependencyGraph.markTargets(child, ref);
    }
  }

  static getNodes(root: TreeNode, nodes = new Set<TreeNode>()): Set<TreeNode> {
    if (nodes.has(root)) return nodes;
    nodes.add(root);
    for (const child of root.children) DependencyGraph.getNodes(child, nodes);
    return nodes;
  }

  /*
   * Create a dependency graph from dependency tree
   */
  static async createDependencyGraph(specifier: string, options: RealLSOptions) {
    const ref = parseSpecifier(specifier);

    logger.infoErr(chalk.gray('Building dependency tree...'));
    const loader = new DependencyTreeLoader(options);
    const root = options.root?.length ? options.root : [process.cwd()];
    const trees = await Promise.all(root.map((dir) => loader.loadDependency(dir)));

    logger.infoErr(chalk.gray(`Matching "${specifier}"...`));
    for (const tree of trees) {
      DependencyGraph.markTargets(tree, ref);
      DependencyGraph.cutNonReachable(tree);
    }

    return new DependencyGraph(specifier, trees);
  }

  /**
   * We want duplicate packages (there can be duplicates in both npm and pnpm)
   * to be marked with an order number in output.
   */
  private markOrderForDuplicates() {
    const nodeByName = new Map();
    for (const node of this.nodes) {
      const name = `${node.name}@${node.version}`;
      if (!nodeByName.has(name)) nodeByName.set(name, []);
      const nodes = nodeByName.get(name)!;
      node.order = nodes.length;
      nodes.push(node);
    }
  }

  /**
   * Filtering out packages not reachable to `specifier`, thus no cycles now exists.
   * Note: the root packages are not cut.
   */
  static cutNonReachable(tree: TreeNode, stack = new Set<TreeNode>()): boolean {
    if (stack.has(tree)) tree.isReachable = false;
    if (tree.isReachable !== undefined) return tree.isReachable;

    if (tree.isTarget) {
      tree.children = [];
      tree.isReachable = true;
      return true;
    }

    stack.add(tree);
    const children = tree.children.filter((child) => DependencyGraph.cutNonReachable(child, stack));
    stack.delete(tree);

    tree.isReachable = children.length > 0;
    tree.children = children;
    return tree.isReachable;
  }
}
