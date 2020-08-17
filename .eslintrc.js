module.exports = {
  'env': {
    'browser': true,
    'es2020': true,
  },
  'extends': [
    'google',
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
    'no-unused-vars': ['off'],
    'valid-jsdoc': ['off'],
    'require-jsdoc': ['off'],
    'indent': ['error', 2],
    'max-len': ['off']
  },
};
