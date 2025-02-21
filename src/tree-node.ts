import { dirname, join, relative } from 'path';
import { readJson } from 'fs-extra';
import { satisfies } from 'semver';
import { DependencyReference, PackageJson } from './npm';
import { PathOption, PrintOptions } from './options';

const CWD = process.cwd();

export class TreeNode {
  name: string;
  isReachable: boolean | undefined;
  isTarget: boolean | undefined;
  depth: number;
  version: string;
  directory: string;
  order?: string;
  children: TreeNode[] = [];
  pkgJson: PackageJson;
  options: PrintOptions;

  constructor(pkgJson: PackageJson, directory: string, depth: number, options: PrintOptions) {
    this.pkgJson = pkgJson;
    this.name = pkgJson.name || '';
    this.version = pkgJson.version || '';
    this.directory = directory;
    this.depth = depth;
    this.children = [];
    this.options = options;
  }

  match(ref: DependencyReference) {
    if (this.name !== ref.name) return false;
    if (ref.version && !satisfies(this.version, ref.version)) return false;
    return true;
  }

  toString() {
    const indicator = this.duplicateIndicator();
    return `${this.name}@${this.version}${indicator}`;
  }

  getDirectory() {
    if (this.options.path === PathOption.absolute) return this.directory;
    if (this.options.path === PathOption.relative) {
      return join('.', relative(CWD, this.directory));
    }
    return undefined;
  }

  private duplicateIndicator() {
    const dir = this.getDirectory();
    if (dir) return ` (${dir})`;
    if (this.order) return ` (${this.order})`;
    return '';
  }

  static async createFromPackageJsonPath(pkgJsonPath: string, options: PrintOptions, parent?: TreeNode) {
    const pkgJson = await readJson(pkgJsonPath);
    const depth = parent ? parent.depth + 1 : 0;
    return new TreeNode(pkgJson, dirname(pkgJsonPath), depth, options);
  }
}
