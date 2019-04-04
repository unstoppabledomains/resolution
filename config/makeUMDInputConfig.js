const commonjs = require('rollup-plugin-commonjs')
const json = require('rollup-plugin-json')
const nodeResolve = require('rollup-plugin-node-resolve')
const terser = require('rollup-plugin-terser')
const typescript = require('rollup-plugin-typescript2')
const namedExports = require('./namedExports.json')

const onwarn = (warning, warn) => {
  if (warning && warning.code === 'THIS_IS_UNDEFINED') return
  warn(warning)
}

module.exports = absolutePackagePath => {
  pkg = require(absolutePackagePath + '/package.json')

  return {
    onwarn,
    plugins: [
      nodeResolve({
        customResolveOptions: {
          moduleDirectory: ['node_modules', absolutePackagePath + '/src'],
        },
      }),
      commonjs({ namedExports }),
      json(),
      typescript(),
      // terser(),
    ],
  }
}
