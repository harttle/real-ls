const eslintrc = {
  extends: [
    'airbnb-base',
    'plugin:jest/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:markdown/recommended',
  ],
  env: {
    node: true,
    jasmine: true,
    jest: true,
    es6: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'jest', 'markdown'],
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': [2, { args: 'none' }],
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'import/prefer-default-export': 'off',
        'class-methods-use-this': 'off',
        'no-multi-assign': 'off',
        'no-constant-condition': 'off',
        'no-plusplus': 'off',
        'no-restricted-syntax': 'off',
        'no-await-in-loop': 'off',
        'no-use-before-define': 'off',
      },
    },
  ],
  rules: {
    'no-console': 'off',
    'no-continue': 'off',
    'no-shadow': 'off',
    'max-len': 'off',
    'import/extensions': 'off',
  },
};

module.exports = eslintrc;
