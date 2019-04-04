module.exports = absolutePackagePath => {
  pkg = require(absolutePackagePath + '/package.json')

  return {
    file: absolutePackagePath + '/' + pkg.main,
    format: 'cjs',
  }
}
