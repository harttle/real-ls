import { join } from 'path';
import { findDependencyPaths } from './dep-path';
import { LogLevel, logger } from './logger';

const FIXTURES_DIR = join(__dirname, '../fixtures/dep-tree');

describe('dep-path', () => {
  beforeAll(() => {
    logger.level = LogLevel.None;
  });
  describe('findDependencyPaths', () => {
    it('should find dependency paths for dep-b@2.0.0', async () => {
      const paths = await findDependencyPaths('dep-b@2.0.0', { cwd: FIXTURES_DIR });

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
      const paths = await findDependencyPaths('dep-c', { cwd: FIXTURES_DIR });

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
