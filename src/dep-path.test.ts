import { join } from 'path';
import { findDependencyPaths, printDependencyPaths } from './dep-path';

const FIXTURES_DIR = join(__dirname, '../fixtures/dep-tree');
const CYCLIC_DIR = join(__dirname, '../fixtures/cyclic');

describe('dep-path', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockReset();
    consoleErrorSpy.mockReset();
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

  describe('printDependencyPaths', () => {
    it('should print paths in tree format', async () => {
      await printDependencyPaths('dep-b@2.0.0', { cwd: FIXTURES_DIR });

      const fullOutput = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');
      expect(fullOutput).toContain('1 path(s) found for "dep-b@2.0.0"');
      expect(fullOutput).toContain('dep-b@2.0.0');
    });

    it('should print paths in JSON format for cyclic deps', async () => {
      await printDependencyPaths('dep-a', { cwd: CYCLIC_DIR, json: true });

      const jsonOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(jsonOutput.paths).toHaveLength(2);
      expect(jsonOutput.paths[0]).toEqual(
        [
          {
            name: 'root-package',
            version: '1.0.0',
            directory: './',
          },
          {
            name: 'dep-a',
            version: '1.0.0',
            directory: './node_modules/dep-a',
          },
        ],
      );
      expect(jsonOutput.paths[1]).toEqual(
        [
          {
            name: 'root-package',
            version: '1.0.0',
            directory: './',
          },
          {
            name: 'dep-b',
            version: '2.0.0',
            directory: './node_modules/dep-b',
          },
          {
            name: 'dep-a',
            version: '1.0.0',
            directory: './node_modules/dep-a',
          },
        ],
      );
    });

    it('should print paths in JSON format with absolute path', async () => {
      await printDependencyPaths('dep-b@2.0.0', { cwd: FIXTURES_DIR, json: true, absolutePath: true });

      const jsonOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(jsonOutput).toEqual({
        target: 'dep-b@2.0.0',
        paths: [
          [
            {
              name: 'root-package',
              version: '1.0.0',
              directory: expect.stringContaining('dep-tree'),
            },
            {
              name: 'dep-b',
              version: '2.0.0',
              directory: expect.stringContaining('node_modules/dep-b'),
            },
          ],
        ],
      });
    });

    it('should print warning if not found', async () => {
      await printDependencyPaths('not-exist@2.0.0', { cwd: FIXTURES_DIR });

      const fullOutput = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      const fullError = consoleErrorSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(fullOutput).toEqual('');
      expect(fullError).toContain('Dependency "not-exist@2.0.0" not found');
    });
  });

  describe('error handling', () => {
    it('printDependencyPaths should warn if cannot be resolved', async () => {
      await printDependencyPaths('dep-a', { cwd: join(__dirname, '../fixtures/missing-dep') });

      const fullOutput = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      const fullWarn = consoleWarnSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(fullOutput).toContain('1 path(s) found for "dep-a"');
      expect(fullWarn).toContain('Dependency "dep-b" not installed for "root-package@1.0.0"');
    });
    it('printDependencyPaths should skip if optional dependency not installed', async () => {
      await printDependencyPaths('dep-a', { cwd: join(__dirname, '../fixtures/missing-optional') });

      const fullOutput = consoleLogSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      const fullWarn = consoleWarnSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      expect(fullOutput).toContain('1 path(s) found for "dep-a"');
      expect(fullWarn).not.toContain('not installed');
    });
  });
});
