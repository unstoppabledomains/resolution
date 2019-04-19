const commonjs = require('rollup-plugin-commonjs')
const json = require('rollup-plugin-json')
const nodeResolve = require('rollup-plugin-node-resolve')
const typescript = require('rollup-plugin-typescript2')
const babel = require('rollup-plugin-babel')
const namedExports = require('./namedExports.json')

const onwarn = (warning, warn) => {
  if (warning && warning.code === 'THIS_IS_UNDEFINED') return
  warn(warning)
}

module.exports = absolutePackagePath => {
  pkg = require(absolutePackagePath + '/package.json')

  return {
    input: absolutePackagePath + '/src/index.ts',
    external: [].concat(
      Object.keys(pkg.dependencies || {}),
      Object.keys(pkg.devDependencies || {}),
      Object.keys(pkg.peerDependencies || {}),
      Object.keys(process.binding('natives')),
    ),
    onwarn,
    plugins: [
      nodeResolve({
        customResolveOptions: {
          moduleDirectory: ['node_modules', absolutePackagePath + '/src'],
        },
      }),
      commonjs({ namedExports }),
      json(),
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            baseUrl: absolutePackagePath + '/src',
            rootDir: absolutePackagePath + '/src',
            declaration: true,
            declarationDir: absolutePackagePath + '/build',
          },
          include: [absolutePackagePath + '/src/*'],
        },
      }),
      babel({
        exclude: 'node_modules/**',
        runtimeHelpers: true,
        babelrc: false,
        presets: [['@babel/preset-env', { modules: false }]],
      }),
    ],
  }
}
