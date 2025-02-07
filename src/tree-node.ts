import { dirname } from 'path';
import { readJson } from 'fs-extra';
import { satisfies } from 'semver';
import { DependencyReference, PackageJson } from './npm';

export class TreeNode {
  name: string;

  version: string;

  directory: string;

  children: TreeNode[] = [];

  pkgJson: PackageJson;

  constructor(pkgJson: PackageJson, directory: string) {
    this.pkgJson = pkgJson;
    this.name = pkgJson.name || '';
    this.version = pkgJson.version || '';
    this.directory = directory;
    this.children = [];
  }

  match(ref: DependencyReference) {
    if (this.name !== ref.name) return false;
    if (ref.version && !satisfies(this.version, ref.version)) return false;
    return true;
  }

  static async createFromPackageJsonPath(pkgJsonPath: string) {
    const pkgJson = await readJson(pkgJsonPath);
    return new TreeNode(pkgJson, dirname(pkgJsonPath));
  }
}
