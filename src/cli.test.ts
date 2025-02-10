import { spawnSync } from 'child_process';
import { join } from 'path';

const exe = join(__dirname, '../dist/cli.js');

describe('CLI Command Test', () => {
  it('should print found dependencies and exit 0', () => {
    const result = spawnSync(exe, ['dep-a'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/dep-tree') });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`.
└── root-package@1.0.0 ./
    └── dep-a@1.0.0 ./node_modules/dep-a
`);
    expect(result.stderr).toBe('Building dependency tree...\nMatching "dep-a"...\n1 path(s) found for "dep-a"\n');
  });

  it('should print absolute path if specified', async () => {
    const result = spawnSync(exe, ['dep-b@2.0.0', '--json', '--absolute-path'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/dep-tree') });

    expect(JSON.parse(result.stdout)).toEqual({
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

  it('should skip non result output if --silent set', () => {
    const result = spawnSync(exe, ['dep-a', '--silent'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/dep-tree') });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(`.
└── root-package@1.0.0 ./
    └── dep-a@1.0.0 ./node_modules/dep-a
`);
    expect(result.stderr).toBe('');
  });

  it('should print JSON when --json set', () => {
    const result = spawnSync(exe, ['dep-a', '--json', '--silent'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/dep-tree') });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      target: 'dep-a',
      paths: [
        [
          {
            directory: './',
            name: 'root-package',
            version: '1.0.0',
          },
          {
            directory: './node_modules/dep-a',
            name: 'dep-a',
            version: '1.0.0',
          },
        ],
      ],
    });
    expect(result.stderr).toBe('');
  });

  it('should print JSON with empty paths when not found', () => {
    const result = spawnSync(exe, ['dep-e', '--json'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/dep-tree') });
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({
      target: 'dep-e',
      paths: [],
    });
    expect(result.stderr).toBe('Building dependency tree...\nMatching "dep-e"...\nDependency "dep-e" not found.\n');
  });

  it('should print JSON only in stdout when --json set', () => {
    const result = spawnSync(exe, ['dep-a', '--json'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/dep-tree') });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      target: 'dep-a',
      paths: [
        [
          {
            directory: './',
            name: 'root-package',
            version: '1.0.0',
          },
          {
            directory: './node_modules/dep-a',
            name: 'dep-a',
            version: '1.0.0',
          },
        ],
      ],
    });
    expect(result.stderr).toBe('Building dependency tree...\nMatching "dep-a"...\n1 path(s) found for "dep-a"\n');
  });

  it('should print no path if --no-path specified', async () => {
    const result = spawnSync(exe, ['dep-a', '--no-path'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/missing-optional') });

    expect(result.stdout).toContain(`.
└── root-package@1.0.0 ./
    └── dep-a@1.0.0 ./node_modules/dep-a`);
  });

  describe('cyclic handling', () => {
    it('should exit properly for cyclic deps', async () => {
      const result = spawnSync(exe, ['dep-c', '--json'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/cyclic') });
      const jsonOutput = JSON.parse(result.stdout);
      expect(jsonOutput.paths).toHaveLength(0);
    });

    it('should print paths in JSON format for cyclic deps', async () => {
      const result = spawnSync(exe, ['dep-a', '--json'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/cyclic') });
      const jsonOutput = JSON.parse(result.stdout);

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
  });

  describe('error handling', () => {
    it('should print error if not found', () => {
      const result = spawnSync(exe, ['dep-d'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/dep-tree') });
      expect(result.status).toBe(1);
      expect(result.stderr).toBe('Building dependency tree...\nMatching "dep-d"...\nDependency "dep-d" not found.\n');
    });

    it('should print help if nothing passed', () => {
      const result = spawnSync(exe, [], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/dep-tree') });
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('Usage: cli.js <package> [options]');
    });

    it('printDependencyPaths should not warn resolve failures', async () => {
      const result = spawnSync(exe, ['dep-a'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/missing-dep') });

      expect(result.stderr).toBe('Building dependency tree...\nMatching "dep-a"...\n1 path(s) found for "dep-a"\n');
    });

    it('printDependencyPaths should warn resolve failures if --verbose specified', async () => {
      const result = spawnSync(exe, ['dep-a', '--verbose'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/missing-dep') });

      expect(result.stderr).toContain('1 path(s) found for "dep-a"');
      expect(result.stderr).toContain('Dependency "dep-b" not installed for "root-package@1.0.0"');
    });

    it('printDependencyPaths should skip if optional dependency not installed', async () => {
      const result = spawnSync(exe, ['dep-a'], { encoding: 'utf-8', cwd: join(__dirname, '../fixtures/missing-optional') });

      expect(result.stderr).toContain('1 path(s) found for "dep-a"');
      expect(result.stderr).not.toContain('not installed');
    });
  });
});
