#!/usr/bin/env node
// import comander from 'commander';
// import pckg from '../package.json';

// /**
//  * Usage
//  * 
//  * 
//  */

// const cli = comander
//   .version(pckg.version)
//   .description("Command line tool for domain resolution")
//   .command('resolve <string>[domain]', {isDefault: true})
//     .description('Resolves the given domain')
//     .option('-c, --currency <string>', 'specify the currency interested')
//     .option('-e, --email', 'request an email')
//     .option('-i, --ipfs', 'get IpfsHash')
//     .option('-e, --email', 'get email')
//     .option('-a, --address', 'get cryptoAddress')
//     .option('-r, --resolver', 'get resolver')
//     .action((domain, options) => {
//       console.log(`resolving ${domain} with options:`, options);
//     })


// comander.parseAsync(process.argv);


import program from 'commander';
import pckg from '../package.json';
import Resolution from '../Resolution.js';
import { secretInfuraLink } from '../utils/testHelpers.js';

const resolution = new Resolution({blockchain: {ens: secretInfuraLink(), cns: secretInfuraLink()}});

async function tryInfo(method, response, name?: string,) {
  const field = name || method;
  try {
    const resolvedPromise = await method();
    response[field] = resolvedPromise;
    return true;
  }catch(err) {
    response[field] = err.code
    return false;
  };
}

program
  .version(pckg.version)
  .description('resolution [command] [options]')
    
program
  .command('resolve <domain>')
  .alias('res')
  .description('resolves the domain')
  .option('-i, --ipfs', 'get IpfsHash')
  .option('-e, --email', 'get email')
  .option('-a, --address <string>', 'get cryptoAddress')
  .option('-r, --resolver', 'get resolver')
  .action(async (domain, options) => {
    const response = {};
    const resolutionProcess = [];
    if (options.ipfs) resolutionProcess.push(tryInfo(() => resolution.ipfsHash(domain), response, 'ipfs'));
    if (options.email) resolutionProcess.push(tryInfo(() => resolution.email(domain), response, 'email'));
    if (options.address) resolutionProcess.push(tryInfo(() => resolution.addressOrThrow(domain, options.address), response, `address<${options.address}>`));
    if (options.resolver) resolutionProcess.push(tryInfo(() => resolution.resolver(domain), response, 'resolver'));
    await Promise.all(resolutionProcess);
    console.log(response);
  });

program.parse(process.argv);