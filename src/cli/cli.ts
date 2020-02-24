#!/usr/bin/env node
import program from 'commander';
import pckg from '../package.json';
import Resolution from '../Resolution.js';
import { secretInfuraLink } from '../utils/testHelpers.js';

const resolution = new Resolution({blockchain: {ens: secretInfuraLink(), cns: secretInfuraLink()}});

async function tryInfo(method, response, name: string,): Promise<boolean> {
  const field = name;
  try {
    const resolvedPromise = await method();
    response[field] = resolvedPromise;
    return true;
  }catch(err) {
    response[field] = err.code
    return false;
  };
}

function commaSeparatedList(value, dummyPrevious) {
  return value.split(',');
}

program
  .version(pckg.version)
  .description('resolution cli exports main usage of @unstoppabledomains/resolution library')

program
  .command('service [domain]')
  .alias('ser')
  .option('-q, --quiet', 'output only the result')
  .description('Returns you a service name from the domain')
  .action(async (domain, options) => {
    try {
      const serviceName = resolution.serviceName(domain);
      if (options.quiet) {
        console.log(serviceName);
        return ;
      }
      console.log(`${domain} => ${serviceName}`);
    }catch(err) {
      console.error('Wrong input');
    }
  });
  
program
  .command('resolve <domain>')
  .alias('res')
  .description('resolves the domain')
  .option('-i, --ipfs', 'get IpfsHash')
  .option('-e, --email', 'get email')
  .option('-a, --addresses <items>', 'comma separated list', commaSeparatedList)
  .option('-r, --resolver', 'get resolver')
  .action(async (domain, options) => {
    const response = {};
    const resolutionProcess: Promise<boolean>[] = [];
    if (options.ipfs) resolutionProcess.push(tryInfo(async () => await resolution.ipfsHash(domain), response, 'ipfs'));
    if (options.email) resolutionProcess.push(tryInfo(async () => await resolution.email(domain), response, 'email'));
    if (options.addresses)  {
      options.addresses.forEach(async ticker => {
        resolutionProcess.push(
          tryInfo(async () => await resolution.addressOrThrow(domain, ticker), response, ticker)
        );
      });
    }
    if (options.resolver) resolutionProcess.push(tryInfo(async () => await resolution.resolver(domain), response, 'resolver'));
    const results = await Promise.all(resolutionProcess);
    console.log(response);
  });

program.parse(process.argv);