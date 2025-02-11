import { join } from 'path';
import { TreeNode } from './tree-node';

describe('TreeNode', () => {
  const fixturesDir = join(__dirname, '../fixtures/dep-tree');

  it('creates node from package.json', async () => {
    const node = await TreeNode.createFromPackageJsonPath(join(fixturesDir, 'package.json'), {});
    expect(node.name).toBe('root-package');
    expect(node.version).toBe('1.0.0');
  });

  it('matches specifier correctly', async () => {
    const node = await TreeNode.createFromPackageJsonPath(join(fixturesDir, 'package.json'), {});
    expect(node.match({ name: 'root-package' })).toBe(true);
    expect(node.match({ name: 'root-package', version: '1.0.0' })).toBe(true);
    expect(node.match({ name: 'root-package', version: '1.0.1' })).toBe(false);
    expect(node.match({ name: 'other-package' })).toBe(false);
  });
});
