import { dirname } from 'path';
import { readJson } from 'fs-extra';
import { satisfies } from 'semver';
import { DependencyReference, PackageJson } from './npm';

export class TreeNode {
  name: string;

  depth: number;

  version: string;

  directory: string;

  children: TreeNode[] = [];

  pkgJson: PackageJson;

  constructor(pkgJson: PackageJson, directory: string, depth: number) {
    this.pkgJson = pkgJson;
    this.name = pkgJson.name || '';
    this.version = pkgJson.version || '';
    this.directory = directory;
    this.depth = depth;
    this.children = [];
  }

  match(ref: DependencyReference) {
    if (this.name !== ref.name) return false;
    if (ref.version && !satisfies(this.version, ref.version)) return false;
    return true;
  }

  static async createFromPackageJsonPath(pkgJsonPath: string, parent?: TreeNode) {
    const pkgJson = await readJson(pkgJsonPath);
    const depth = parent ? parent.depth + 1 : 0;
    return new TreeNode(pkgJson, dirname(pkgJsonPath), depth);
  }
}
