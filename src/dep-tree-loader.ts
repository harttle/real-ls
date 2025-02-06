import fs from 'fs';
import chalk from 'chalk';
import { dirname } from 'path';
import { Resolver, CachedInputFileSystem, ResolverFactory } from 'enhanced-resolve';
import { TreeNode } from './dep-tree';
import { PackageJson, findNearestPackageJson } from './npm';

interface LoadTreeOptions {
  excludeDev?: boolean;
  excludePeer?: boolean;
  excludeOptional?: boolean;
  mainField?: 'browser' | 'main' | 'module';
}
export class DependencyTreeLoader {
  loadedNodes = new Map<string, TreeNode>();

  options: LoadTreeOptions;

  resolver: Resolver;

  constructor(options: LoadTreeOptions) {
    this.options = options;
    this.resolver = ResolverFactory.createResolver({
      extensions: ['.js', '.mjs', '.json'],
      // use package.json instead of entry file to ensure `resolve` always succeed
      mainFiles: ['package.json'],
      mainFields: ['browser', 'module', 'main'],
      conditionNames: ['import', 'require'],
      fileSystem: new CachedInputFileSystem(fs as any, 4000),
    });
  }

  async loadDependency(dir: string, path: Map<string, TreeNode> = new Map()): Promise<TreeNode> {
    const pkgJsonPath = await findNearestPackageJson(dir);
    if (this.loadedNodes.has(pkgJsonPath)) {
      return this.loadedNodes.get(pkgJsonPath)!;
    }
    if (path.has(pkgJsonPath)) {
      return path.get(pkgJsonPath)!;
    }
    const node = await TreeNode.createFromPackageJsonPath(pkgJsonPath);
    path.set(pkgJsonPath, node);
    node.children = (await Promise.all([...this.getDependencies(node.pkgJson)]
      .map(async ([dependency, required]) => {
        try {
          return await this.resolveAndLoadDependency(dependency, dir, path);
        } catch (err) {
          if (required) {
            console.warn(`Dependency "${dependency}" not installed for "${node.name}@${node.version}"`, chalk.grey(`(${node.directory})`));
          }
          return null;
        }
      })))
      .filter((x) => !!x) as TreeNode[];
    this.loadedNodes.set(pkgJsonPath, node);
    path.delete(pkgJsonPath);
    return node;
  }

  async resolveAndLoadDependency(
    packageName: string,
    fromDirectory: string,
    path: Map<string, TreeNode> = new Map(),
  ): Promise<TreeNode> {
    return new Promise((resolve, reject) => {
      this.resolver.resolve(
        {},
        fromDirectory,
        packageName,
        {},
        (err: Error | null, res?: string | false) => {
          if (err) return reject(err);
          if (!res) return reject(new Error(`failed to resolve ${packageName} from ${fromDirectory}`));
          return resolve(this.loadDependency(dirname(res), path));
        },
      );
    });
  }

  getDependencies(pkgJson: PackageJson): Map<string, boolean> {
    const dependencies: Map<string, boolean> = new Map();
    const addDependencies = (
      deps: Record<string, string> = {},
      meta: Record<string, Record<string, unknown>> = {},
      isOptional = false,
    ) => {
      for (const key of Object.keys(deps)) {
        if (dependencies.get(key)) continue;
        const required = !isOptional && !(meta[key] as any)?.optional;
        dependencies.set(key, required);
      }
    };
    addDependencies(pkgJson.dependencies, pkgJson.dependenciesMeta, false);
    if (!this.options.excludeDev) {
      addDependencies(pkgJson.devDependencies, pkgJson.devDependenciesMeta, true);
    }
    if (!this.options.excludePeer) {
      addDependencies(pkgJson.peerDependencies, pkgJson.peerDependenciesMeta, false);
    }
    if (!this.options.excludeOptional) {
      addDependencies(pkgJson.optionalDependencies, pkgJson.optionalDependenciesMeta, true);
    }
    return dependencies;
  }
}
