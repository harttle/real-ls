import npa from 'npm-package-arg';
import { pathExists } from 'fs-extra';
import { join, dirname } from 'path';

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  dependenciesMeta?: Record<string, Record<string, unknown>>;
  devDependenciesMeta?: Record<string, Record<string, unknown>>;
  peerDependenciesMeta?: Record<string, Record<string, unknown>>;
  optionalDependenciesMeta?: Record<string, Record<string, unknown>>;
}

export async function findNearestPackageJson(startPath: string): Promise<string> {
  let currentDir = startPath;
  while (true) {
    const pkgPath = join(currentDir, 'package.json');
    if (await pathExists(pkgPath)) {
      return pkgPath;
    }
    if (currentDir === dirname(currentDir)) {
      throw new Error(`Could not find package.json in ${currentDir}`);
    }
    currentDir = dirname(currentDir);
  }
}

export interface DependencyReference {
  name: string;
  version?: string;
}

export function parseSpecifier(specifier: string): DependencyReference {
  const { name, rawSpec } = npa(specifier);
  return {
    name: name || '',
    version: rawSpec,
  };
}
