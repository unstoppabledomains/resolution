module.exports = {
  'env': {
    'browser': true,
    'es2020': true,
    'jest': true,
  },
  'extends': [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    // 'plugin:@typescript-eslint/recommended',
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaVersion': 11,
    'sourceType': 'module',
  },
  'plugins': [
    '@typescript-eslint',
  ],
  'rules': {
    'object-curly-spacing': ['off'],
    curly: ['error'],
    'brace-style': 'error',
    'no-unused-vars': ['off'],
    'valid-jsdoc': ['off'],
    'require-jsdoc': ['off'],
    'indent': ['error', 2],
  },
};
