#!/usr/bin/env node
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