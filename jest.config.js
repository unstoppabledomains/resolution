const { jestPreset } = require('ts-jest')

module.exports = {
  projects: [
    '<rootDir>/packages/namicorn',
    '<rootDir>/packages/@namicorn/core',
    '<rootDir>/packages/@namicorn/ens',
    '<rootDir>/packages/@namicorn/zns',
    '<rootDir>/packages/@namicorn/rns',
  ].map(path => {
    const pkgName = path.slice(19)

    return {
      name: pkgName,
      displayName: pkgName,
      preset: 'ts-jest',
      // rootDir: path,
      testMatch: [
        path + '/**/__tests__/**/*.[jt]s?(x)',
        path + '/**/?(*.)+(spec|test).[tj]s?(x)',
      ],
      // modulePaths: [
      //   path + '/src',
      //   __dirname + '/node_modules',
      //   'node_modules',
      //   '../../node_modules',
      // ],
      globals: {
        'ts-jest': {
          tsConfig: {
            baseUrl: path + '/src',
          },
        },
      },
    }
  }),
}

module.exports = {
  preset: 'ts-jest',
  rootDir: './packages',
  globals: {
    'ts-jest': {
      tsConfig: {
        baseUrl: './packages',
        rootDir: './packages',
      },
    },
  },
}
