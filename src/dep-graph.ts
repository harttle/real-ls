import chalk from 'chalk';
import { DependencyTreeLoader } from './dep-tree-loader';
import { parseSpecifier } from './npm';
import { FindDependencyPathsOptions } from './options';
import { TreeNode } from './tree-node';
import { logger } from './logger';

// only nodes from which target is reachable
export type Graph = Map<TreeNode, TreeNode[]>;
// all nodes traversed, not necessary to be all deps
export type RawGraph = Map<TreeNode, TreeNode[] | null>

export class DependencyGraph {
  G?: Graph;

  async loadTree(options: FindDependencyPathsOptions) {
    const cwd = options.cwd ?? process.cwd();
    return new DependencyTreeLoader(options).loadDependency(cwd);
  }

  async createDependencyGraph(specifier: string, options: FindDependencyPathsOptions) {
    const ref = parseSpecifier(specifier);
    const cwd = options.cwd ?? process.cwd();

    logger.infoErr(chalk.gray('Building dependency tree...'));
    const tree = await new DependencyTreeLoader(options).loadDependency(cwd);

    logger.infoErr(chalk.gray(`Matching "${specifier}"...`));
    const G: RawGraph = new Map();

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

    this.G = this.normalize(G);
    return this.G;
  }

  private normalize(G: RawGraph): Graph {
    this.removeNodesNotReachableTarget(G);
    this.markOrderForDuplicates(G);
    return G as Graph;
  }

  private markOrderForDuplicates(G: RawGraph) {
    const nodeByName = new Map();
    for (const node of G.keys()) {
      const name = `${node.name}@${node.version}`;
      if (!nodeByName.has(name)) nodeByName.set(name, []);
      const nodes = nodeByName.get(name)!;
      node.order = nodes.length;
      nodes.push(node);
    }
  }

  private removeNodesNotReachableTarget(G: RawGraph) {
    for (const [k, v] of G) if (v == null) G.delete(k);
  }
}
