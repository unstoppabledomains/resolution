const camelcase = require('camelcase')

module.exports = absolutePackagePath => {
  pkg = require(absolutePackagePath + '/package.json')

  return {
    file: absolutePackagePath + '/' + pkg.browser,
    format: 'umd',
    name: pkg.umdName || camelcase(pkg.name, { pascalCase: true }),
  }
}
