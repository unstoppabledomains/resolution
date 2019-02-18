import fs from 'fs'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import nodeResolve from 'rollup-plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import camelCase from 'camelcase'

const pkg = JSON.parse(fs.readFileSync('package.json'))
const babelRc = JSON.parse(fs.readFileSync('.babelrc'))

babelRc.presets[0][1].modules = false

const commonPlugins = [
  json(),
  babel({
    ...babelRc,
    runtimeHelpers: true,
    babelrc: false,
    // externalHelpers: true,
  }),

  nodeResolve({
    preferBuiltins: true,
  }),
  commonjs({
    namedExports: {
      'node_modules/ethers/index.js': ['getDefaultProvider', 'Contract'],
      'node_modules/@zilliqa-js/proto/dist/index.js': ['ZilliqaMessage'],
      'node_modules/hash.js/lib/hash.js': ['sha256'],
    },
  }),
]

const devConfig = {
  output: {
    file: pkg.main,
    format: 'cjs',
    exports: 'named',
  },

  plugins: commonPlugins,
}

const cjsConfig = {
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
    },
    {
      file: pkg.module,
      format: 'es',
      exports: 'named',
      sourcemap: true,
    },
  ],

  plugins: commonPlugins,
}

const umdConfig = {
  output: {
    file: pkg.browser,
    format: 'umd',
    name: camelCase(pkg.name, { pascalCase: true }),
    exports: 'named',
    sourcemap: true,
  },

  plugins: commonPlugins.concat(terser()),
}

export default (process.env.NODE_ENV !== 'production'
  ? devConfig
  : [cjsConfig, umdConfig])
