const fs = require('fs');

const pckg = JSON.parse(fs.readFileSync('./package.json'));
const version = pckg.version;

const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.json'));
console.log({test: tsconfig.typedocOptions.out});
tsconfig.typedocOptions.out = `./formal-docs/v${version}`;
console.log({test: tsconfig.typedocOptions.out});
fs.writeFileSync('./tsconfig.json', JSON.stringify(tsconfig));