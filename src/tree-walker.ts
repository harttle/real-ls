import { TreeNode } from './dep-tree';

export interface TreeVisitor {
  (node: TreeNode, path: TreeNode[], cyclic: boolean): boolean;
}

export class TreeWalker {
  dfs(root: TreeNode, visit: TreeVisitor) {
    this.doDfs(root, new Set(), visit);
  }

  doDfs(node: TreeNode, path: Set<TreeNode>, visit: TreeVisitor) {
    if (path.has(node)) {
      visit(node, [...path, node], true);
      return;
    }
    path.add(node);
    const end = visit(node, [...path], false);
    if (!end) {
      for (const dep of node.children) {
        this.doDfs(dep, path, visit);
      }
    }
    path.delete(node);
  }
}
