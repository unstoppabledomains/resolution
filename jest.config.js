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
  testTimeout: 40000,
  coveragePathIgnorePatterns : [
    '/node_modules/',
    '/src/tests/',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/config/jestSetup.ts'],
};
