#!/usr/bin/env node
import program from 'commander';
import pckg from '../package.json';
import { buildResolutionPackage, commaSeparatedList, tryInfo } from './cli-helpers.js';
import dotenv from 'dotenv';

dotenv.config();
(async () => {

	program
		.version(pckg.version)
		.requiredOption('-d, --domain <domain>', 'domain you wish to resolve')
		.option('-s, --service', 'returns you a service name from the domain')
		.option('-i, --ipfs', 'get IpfsHash')
		.option('-e, --email', 'get email')
		.option('-r, --resolver', 'get resolver address')	
		.option('-c, --currencies <currencies>', 'comma separated list of currency tickers', commaSeparatedList)
		.description('resolution cli exports main usage of @unstoppabledomains/resolution library');
	
	program.parse(process.argv)

	const resolution = buildResolutionPackage();
	const response = {};
	const domain = program.domain;
	const resolutionProcess: Promise<boolean>[] = [];
	if (program.ipfs)
		resolutionProcess.push(tryInfo(async () => await resolution.ipfsHash(domain), response, 'ipfs'));
	if (program.email)
		resolutionProcess.push(tryInfo(async () => await resolution.email(domain), response, 'email'));
	if (program.currencies) {
		program.currencies.forEach(async (currency) => {
			resolutionProcess.push(
				tryInfo(async () => await resolution.addressOrThrow(domain, currency), response, currency)
			);
		});
	}
	if (program.resolver)
		resolutionProcess.push(tryInfo(async () => await resolution.resolver(domain), response, 'resolver'));
	if (program.service)
		resolutionProcess.push(tryInfo(async () => resolution.serviceName(domain), response, 'service'));
	await Promise.all(resolutionProcess);
	console.log(response);
})();	
