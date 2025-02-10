import fs from 'fs';
import chalk from 'chalk';
import { dirname } from 'path';
import { Resolver, CachedInputFileSystem, ResolverFactory } from 'enhanced-resolve';
import { TreeNode } from './tree-node';
import { PackageJson, findNearestPackageJson } from './npm';
import { logger } from './logger';

interface LoadTreeOptions {
  excludeDev?: boolean;
  excludePeer?: boolean;
  excludeOptional?: boolean;
  mainField?: 'browser' | 'main' | 'module';
}
export class DependencyTreeLoader {
  pending = new Map<string, Promise<TreeNode>>();

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

  async loadDependency(dir: string): Promise<TreeNode> {
    const pkgJsonPath = await findNearestPackageJson(dir);
    if (this.pending.has(pkgJsonPath)) {
      // TreeNode only, maybe without children populated
      return this.pending.get(pkgJsonPath)!;
    }
    const pending = TreeNode.createFromPackageJsonPath(pkgJsonPath);
    this.pending.set(pkgJsonPath, pending);

    const node = await pending;
    node.children = (await Promise.all([...this.getDependencies(node.pkgJson)]
      .map(([dependency, required]) => this.resolveAndLoadDependencyOrNull(dependency, required, node))))
      .filter((x) => !!x) as TreeNode[];
    return node;
  }

  private async resolveAndLoadDependencyOrNull(dependency: string, required: boolean, parent: TreeNode) {
    try {
      return await this.resolveAndLoadDependency(dependency, parent.directory);
    } catch (err) {
      if (required) {
        logger.logErr(`Dependency "${dependency}" not installed for "${parent.name}@${parent.version}"`, chalk.grey(`(${parent.directory})`));
      }
      return null;
    }
  }

  async resolveAndLoadDependency(
    packageName: string,
    fromDirectory: string,
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
          return resolve(this.loadDependency(dirname(res)));
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
