import { join } from 'path';
import { DependencyGraph } from './dep-graph';
import { LogLevel, logger } from './logger';

describe('DependencyGraph', () => {
  const DEP_TREE = join(__dirname, '../fixtures/dep-tree');
  const DUPLICATE = join(__dirname, '../fixtures/duplicate');
  const FIXTURES_DIR = join(__dirname, '../fixtures/dep-tree');

  beforeAll(() => {
    logger.level = LogLevel.None;
  });

  describe('.createDependencyGraph()', () => {
    it('the root should be entry package', async () => {
      const G = await DependencyGraph.createDependencyGraph('dep-a', { root: [DEP_TREE] });
      const tree = G.roots[0];
      expect(tree.toString()).toBe('root-package@1.0.0');
    });
  });

  describe('.getAllPaths()', () => {
    it('should return the path to target dependency', async () => {
      const G = await DependencyGraph.createDependencyGraph('dep-a', { root: [DEP_TREE] });
      const paths = [...G.getAllPaths()];
      expect(paths).toHaveLength(1);
      expect(paths[0].join(' => ')).toEqual('root-package@1.0.0 => dep-a@1.0.0');
    });
    it('should return all the paths', async () => {
      const G = await DependencyGraph.createDependencyGraph('dep-a', { root: [DUPLICATE], includeOptional: true });
      const paths = [...G.getAllPaths()];
      expect(paths).toHaveLength(2);
      expect(paths[0].join(' => ')).toEqual('root-package@1.0.0 => dep-a@1.0.0');
      expect(paths[1].join(' => ')).toEqual('root-package@1.0.0 => dep-b@2.0.0 => dep-a@1.0.0 (1)');
    });
  });

  describe('.getPathsWithLimit()', () => {
    it('should return only specified number of paths', async () => {
      const G = await DependencyGraph.createDependencyGraph('dep-a', { root: [DUPLICATE], includeOptional: true });
      const paths = [...G.getPathsWithLimit(1)];
      expect(paths).toHaveLength(1);
      expect(paths[0].join(' => ')).toEqual('root-package@1.0.0 => dep-a@1.0.0');
    });

    it('should find dependency paths for dep-b@2.0.0', async () => {
      const G = await DependencyGraph.createDependencyGraph('dep-b@2.0.0', { root: [FIXTURES_DIR] });
      const paths = G.getPathsWithLimit(1e3);

      expect(paths).toEqual([
        [
          expect.objectContaining({
            name: 'root-package',
            version: '1.0.0',
            directory: expect.stringContaining('dep-tree'),
          }),
          expect.objectContaining({
            name: 'dep-b',
            version: '2.0.0',
            directory: expect.stringContaining('node_modules/dep-b'),
          }),
        ],
      ]);
    });

    it('should find multiple paths for shared dependencies', async () => {
      const G = await DependencyGraph.createDependencyGraph('dep-c', { root: [FIXTURES_DIR] });
      const paths = G.getPathsWithLimit(1e3);

      expect(paths).toHaveLength(2);
      expect(paths[0]).toEqual(
        [
          expect.objectContaining({
            name: 'root-package',
            version: '1.0.0',
            directory: expect.stringContaining('dep-tree'),
          }),
          expect.objectContaining({
            name: 'dep-a',
            version: '1.0.0',
            directory: expect.stringContaining('node_modules/dep-a'),
          }),
          expect.objectContaining({
            name: 'dep-c',
            version: '1.0.0',
            directory: expect.stringContaining('node_modules/dep-c'),
          }),
        ],
      );
      expect(paths[1]).toEqual(
        [
          expect.objectContaining({
            name: 'root-package',
            version: '1.0.0',
            directory: expect.stringContaining('dep-tree'),
          }),
          expect.objectContaining({
            name: 'dep-c',
            version: '1.0.0',
            directory: expect.stringContaining('node_modules/dep-c'),
          }),
        ],
      );
    });
  });
});
