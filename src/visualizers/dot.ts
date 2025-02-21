import { DependencyGraph } from '../dep-graph';
import { TreeNode } from '../tree-node';

export function handleDOT(G: DependencyGraph) {
  const str = createDOT(G);
  process.stdout.write(str);
  return true;
}

export function createDOT(G: DependencyGraph) {
  const D = [...G.nodes].reduce((prev, curr) => Math.max(prev, curr.depth), 0) + 1;
  const nodeByRank: TreeNode[][] = Array(D).fill(0).map((_) => []);
  for (const node of G.nodes) {
    nodeByRank[node.depth].push(node);
  }
  const ranks: string[] = [];
  for (const nodes of nodeByRank.values()) {
    const list = nodes.map((x: TreeNode) => `"${x}";`).join(' ');
    ranks.push(`{ rank=same; ${list} }`);
  }

  const colors: string[] = [];
  for (const u of G.nodes) {
    if (u.isTarget) colors.push(`"${u}" [color=red fontcolor=red]`);
  }

  const edgeStrings: string[] = [];
  for (const u of G.nodes) {
    for (const v of u.children) {
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
