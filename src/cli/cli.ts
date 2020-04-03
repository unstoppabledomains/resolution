#!/usr/bin/env node
import program from 'commander';
import pckg from '../package.json';
import {
  buildResolutionPackage,
  commaSeparatedList,
  tryInfo,
  storeConfig,
  parseConfig,
} from './cli-helpers.js';

(async () => {
  program
    .storeOptionsAsProperties(false)
    .version(pckg.version)
    .option(
      '-c, --currencies <currencies>',
      'comma separated list of currency tickers',
      commaSeparatedList,
    )
    .option(
      '-C, --config <option>',
      `option in format <key>:<value>\n\tkey can be either \"infura\" or \"url\"`,
      parseConfig,
      )
    .option('-s, --service', 'returns you a service name from the domain')
    .option('-i, --ipfs', 'get IpfsHash')
    .option('-r, --resolver', 'get resolver address')
    .option('-e, --email', 'get email')
    .option('-n, --namehash', `returns domain's namehash`)
    .option('-o, --owner', `returns domain's owner`)
    .option('-m, --meta', 'shortcut for all meta data options (-siren)')
    .option('-d, --domain <domain>', 'domain you wish to resolve')
    .description(
      'resolution cli exports main usage of @unstoppabledomains/resolution library',
    );

  program.parse(process.argv);

  const options = program.opts();
  if (options.meta) {
    options.service = true;
    options.ipfs = true;
    options.resolver = true;
    options.email = true;
    options.namehash = true;
    options.owner = true;
    delete options.meta;
  }

  if (options.config) {
    const { type, value } = options.config;
    if (type == 'infura' || type == 'url') storeConfig(type, value);
    delete options.config;
  }

  if (!options.domain) return;

  const { domain } = options;
  delete options.domain;

  const resolution = buildResolutionPackage();
  const response = {};
  
  const commandTable = {
    ipfs: () => tryInfo(async () => await resolution.ipfsHash(domain), response, 'ipfs'),
    email: () => tryInfo(async () => await resolution.email(domain), response, 'email'),
    resolver: () => tryInfo(async () => await resolution.resolver(domain), response, 'resolver'),
    service: () => tryInfo(() => resolution.serviceName(domain), response, 'service'),
    namehash: () => tryInfo(() => resolution.namehash(domain), response, 'namehash'),
    owner: () => tryInfo(async () => await resolution.owner(domain), response, 'owner')
  };

  const resolutionProcess: Promise<boolean>[] = [];
  // Execute resolution for each currency
  if (options.currencies) {
    options.currencies.forEach(async (currency:string) => {
      resolutionProcess.push(
        tryInfo(
          async () => await resolution.addressOrThrow(domain, currency),
          response,
          currency,
        ),
      );
    });
    delete options.currencies;
  }
  // Execute the rest of options
  Object.keys(options).forEach(option => resolutionProcess.push(commandTable[option]()));

  await Promise.all(resolutionProcess);
  console.log(response);
})();
