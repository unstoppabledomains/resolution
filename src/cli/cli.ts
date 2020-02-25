#!/usr/bin/env node
import program from 'commander';
import pckg from '../package.json';
import { buildResolutionPackage, commaSeparatedList, tryInfo } from './cli-helpers.js';

program
	.version(pckg.version)
	.description('resolution cli exports main usage of @unstoppabledomains/resolution library');

program
.command('doctor')
.description('checks the setup for resolution cli')
.action(() => {
  const enviromentStatus = {
    INFURA: !!process.env.INFURA,
    RESOLUTION_URL: !!process.env.RESOLUTION_URL
  };
  console.log('Enviroment variables status');
  console.log(enviromentStatus);
  console.log('Reminder RESOLUTION_URL overides INFURA key');
});

program
	.command('service [domain]')
	.alias('ser')
	.option('-q, --quiet', 'output only the result')
	.description('Returns you a service name from the domain')
	.action(async (domain, options) => {
		try {
			const resolution = buildResolutionPackage();
			const serviceName = resolution.serviceName(domain);
			if (options.quiet) {
				console.log(serviceName);
				return;
			}
			console.log(`${domain} => ${serviceName}`);
		} catch (err) {
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
		const resolution = buildResolutionPackage();
		const response = {};
		const resolutionProcess: Promise<boolean>[] = [];
		if (options.ipfs)
			resolutionProcess.push(tryInfo(async () => await resolution.ipfsHash(domain), response, 'ipfs'));
		if (options.email)
			resolutionProcess.push(tryInfo(async () => await resolution.email(domain), response, 'email'));
		if (options.addresses) {
			options.addresses.forEach(async (ticker) => {
				resolutionProcess.push(
					tryInfo(async () => await resolution.addressOrThrow(domain, ticker), response, ticker)
				);
			});
		}
		if (options.resolver)
			resolutionProcess.push(tryInfo(async () => await resolution.resolver(domain), response, 'resolver'));
		await Promise.all(resolutionProcess);
		console.log(response);
	});

program.parse(process.argv);
