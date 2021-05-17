module.exports = {
  env: {
    browser: true,
    es2020: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'object-curly-spacing': ['off'],
    curly: ['error'],
    'brace-style': 'error',
    'no-unused-vars': ['off'],
    'valid-jsdoc': ['off'],
    'require-jsdoc': ['off'],
    indent: ['warn', 2],
    '@typescript-eslint/no-unused-vars': ['warn', {args: 'none'}],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': [
      'warn',
      {allowArgumentsExplicitlyTypedAsAny: true},
    ],
    '@typescript-eslint/no-non-null-assertion': 'off',
  },
};
