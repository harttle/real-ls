import { join } from 'path';
import { DependencyTreeLoader } from './dep-tree-loader';
import { LogLevel, logger } from './logger';

describe('dep-tree-loader', () => {
  const fixturesDir = join(__dirname, '../fixtures/dep-tree');
  const cyclicDir = join(__dirname, '../fixtures/cyclic');
  const loader = new DependencyTreeLoader({});
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockReset();
  });

  it('loads direct dependencies', async () => {
    const tree = await loader.resolveAndLoadDependency('dep-a', fixturesDir);
    expect(tree.name).toBe('dep-a');
    expect(tree.version).toBe('1.0.0');
  });

  it('loads mjs entry', async () => {
    const tree = await loader.resolveAndLoadDependency('dep-b', fixturesDir);
    expect(tree.name).toBe('dep-b');
    expect(tree.version).toBe('2.0.0');
  });

  it('throws when package not found', async () => {
    await expect(loader.resolveAndLoadDependency('non-existent-pkg', fixturesDir)).rejects.toThrow();
  });

  it('should prefer module entry', async () => {
    const tree = await loader.resolveAndLoadDependency('dep-c', fixturesDir);
    expect(tree.name).toBe('dep-c');
  });

  it('should load cyclic dependencies', async () => {
    const tree = await loader.resolveAndLoadDependency('dep-a', cyclicDir);
    expect(tree.name).toBe('dep-a');
    expect(tree.children.length).toEqual(1);
    expect(tree.children[0]).toHaveProperty('name', 'dep-b');
    expect(tree.children[0].children).toHaveLength(1);
    expect(tree.children[0].children[0]).toEqual(tree);
  });

  it('should skip missing optional dependency', async () => {
    logger.level = LogLevel.Log;
    await loader.loadDependency(join(__dirname, '../fixtures/missing-optional/'));
    const fullWarn = consoleWarnSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(fullWarn).not.toContain('not installed');
  });

  it('should warn missing peer dependency', async () => {
    logger.level = LogLevel.Log;
    await loader.loadDependency(join(__dirname, '../fixtures/missing-peer/'));
    const fullWarn = consoleWarnSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(fullWarn).toContain('Dependency "dep-a" not installed for "root-package@1.0.0"');
  });

  it('should skip missing optional peer dependency', async () => {
    logger.level = LogLevel.Log;
    await loader.loadDependency(join(__dirname, '../fixtures/missing-optional-peer/'));
    const fullWarn = consoleWarnSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(fullWarn).not.toContain('not installed');
  });
});
