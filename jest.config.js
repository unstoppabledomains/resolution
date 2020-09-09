module.exports = {
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  testTimeout: 12000,
  coveragePathIgnorePatterns : [
    '/node_modules/',
    '/src/tests/',
  ]
};
