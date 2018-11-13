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

export default (process.env.NODE_ENV !== 'production'
  ? {
      input: 'src/index.js',

      output: {
        file: pkg.main,
        format: 'cjs',
        exports: 'named',
      },

      plugins: [
        json(),
        babel({
          ...babelRc,
          runtimeHelpers: true,
          babelrc: false,
        }),
      ],
    }
  : [
      {
        input: 'src/index.js',

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

        plugins: [
          json(),
          babel({
            ...babelRc,
            runtimeHelpers: true,
            babelrc: false,
          }),
        ],
      },
      {
        input: 'src/index.js',

        output: {
          file: pkg.browser,
          format: 'umd',
          name: camelCase(pkg.name, { pascalCase: true }),
          exports: 'named',
          sourcemap: true,
        },

        plugins: [
          json(),
          babel({
            ...babelRc,
            runtimeHelpers: true,
            babelrc: false,
          }),

          nodeResolve(),
          commonjs(),

          terser(),
        ],
      },
    ])
