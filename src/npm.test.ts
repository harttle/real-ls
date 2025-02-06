import { join } from 'path';
import { findNearestPackageJson, parseSpecifier } from './npm';

describe('npm utils', () => {
  describe('.findNearestPackageJson()', () => {
    const fixturesDir = join(__dirname, '../fixtures/nested-packages');

    it('finds nearest package.json in parent dir', async () => {
      const pkgPath = await findNearestPackageJson(join(fixturesDir, 'a/b/c'));
      expect(pkgPath).toContain('a/package.json');
    });

    it('finds package.json in current dir', async () => {
      const pkgPath = await findNearestPackageJson(fixturesDir);
      expect(pkgPath).toContain('nested-packages/package.json');
    });
  });
  describe('.parseSpecifier()', () => {
    it('parses package name', () => {
      const { name, version } = parseSpecifier('foo');
      expect(name).toEqual('foo');
      expect(version).toBeUndefined();
    });
    it('parses package name and version', () => {
      const { name, version } = parseSpecifier('foo@1.3.3');
      expect(name).toEqual('foo');
      expect(version).toEqual('1.3.3');
    });
  });
});
