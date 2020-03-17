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
    .option('-i, --ipfs', 'get IpfsHash')
    .option('-e, --email', 'get email')
    .option('-r, --resolver', 'get resolver address')
    .option('-s, --service', 'returns you a service name from the domain')
    .option('-d, --domain <domain>', 'domain you wish to resolve')
    .description(
      'resolution cli exports main usage of @unstoppabledomains/resolution library',
    );

  program.parse(process.argv);

  if (program.config) {
    const { type, value } = program.config;
    if (type == 'infura' || type == 'url') storeConfig(type, value);
  }
  if (!program.domain) return;
  const resolution = buildResolutionPackage();
  const response = {};
  const domain = program.domain;
  const resolutionProcess: Promise<boolean>[] = [];
  if (program.ipfs)
    resolutionProcess.push(
      tryInfo(async () => await resolution.ipfsHash(domain), response, 'ipfs'),
    );
  if (program.email)
    resolutionProcess.push(
      tryInfo(async () => await resolution.email(domain), response, 'email'),
    );
  if (program.currencies) {
    program.currencies.forEach(async currency => {
      resolutionProcess.push(
        tryInfo(
          async () => await resolution.addressOrThrow(domain, currency),
          response,
          currency,
        ),
      );
    });
  }
  if (program.resolver)
    resolutionProcess.push(
      tryInfo(
        async () => await resolution.resolver(domain),
        response,
        'resolver',
      ),
    );
  if (program.service)
    resolutionProcess.push(
      tryInfo(async () => resolution.serviceName(domain), response, 'service'),
    );
  await Promise.all(resolutionProcess);
  console.log(response);
})();
