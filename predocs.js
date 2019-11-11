const fs = require('fs');

const pckg = JSON.parse(fs.readFileSync('./package.json'));
const version = pckg.version;

pckg.scripts["docs:deploy"] = `./deploy-docs.sh dist ${version}`;
fs.writeFileSync('./package.json', JSON.stringify(pckg));
const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.json'));
tsconfig.typedocOptions.out = `./dist/v${version}`;
fs.writeFileSync('./tsconfig.json', JSON.stringify(tsconfig));

let README = fs.readFileSync('./dist/README.md', 'utf8');

const ReadmeLink = (readme, version) => {
  const draft = /\[(Current Version)\]\((.+)\)/;
  const currentVersionReg = /\/(v\d+?[.]\d+?[.]\d+?)\//;
  const link = readme.match(draft)[2];
  const currentVersion = link.match(currentVersionReg);
  const newLink = link.replace(currentVersion[1], version);
  let newReadme = readme.replace(link, newLink);
  const newOldVersion = `[${currentVersion[1]}](${link})\n`;
  newReadme = newReadme.replace(/## Old Versions\s/, `## Old Versions\n${newOldVersion}`);
  return newReadme;
}
README = ReadmeLink(README, `v${version}`);
fs.writeFileSync('./dist/README.md', README);
