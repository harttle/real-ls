# real-ls

Behaves similar to `npm-ls` but resolves dependencies by `require.resolve` instead of reading lockfiles (as in [loadVirtual][loadVirtual]) or reading `node_modules` (as in [loadActual][loadActual]). This makes it somewhat:

- **universal** as it doesn't make assumptions about how node_modules are organized, works for pnpm and rush.
- **useful** for debugging build issues in webpack/rollup/etc., as it points out the actual resolved dependencies.

## Usage

Using npx:

```bash
npx real-ls lodash
npx real-ls lodash@4.17.21
```

Install globally:

```bash
npm install -g real-ls
real-ls lodash
```

## Arguments

```bash
real-ls --help
```

[loadVirtual]: https://github.com/npm/cli/blob/3a80a7b7d168c23b5e297cba7b47ba5b9875934d/workspaces/arborist/lib/arborist/load-virtual.js#L31
[loadActual]: https://github.com/npm/cli/blob/3a80a7b7d168c23b5e297cba7b47ba5b9875934d/workspaces/arborist/lib/arborist/load-actual.js#L59
