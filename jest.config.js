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
  testTimeout: 50000,
  coveragePathIgnorePatterns: ['/node_modules/', '/src/tests/'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/jestSetup.ts'],
};
