import { Zilliqa } from '@zilliqa-js/zilliqa';
import { Contract } from '@zilliqa-js/contract';
import { toChecksumAddress } from '@zilliqa-js/crypto';
import namehash from './zns/namehash';
import _ from 'lodash';
import { fstat } from 'fs';

const DEFAULT_SOURCE = 'https://api.zilliqa.com/';
const registryAddress = 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz';
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

type ResolverRecord = { key: string; val: string };
type ResolverRecordsStructure = {
	crypto?: { [key: string]: { address: string } };
	ttl?: string;
	[key: string]: any;
};

type ZNSResolve = {
	crypto?: { [key: string]: { address: string } };
	ttl?: string;
	[key: string]: any;
};

export default class {
	registry: Contract;
	zilliqa: Zilliqa;

	constructor(source: string | boolean = DEFAULT_SOURCE) {
		if (source == true) {
			source = DEFAULT_SOURCE;
		}
		source = source.toString();
		this.zilliqa = new Zilliqa(source);
		this.registry = this.zilliqa.contracts.at(registryAddress);
	}

	async getContractField(contract: Contract, field: string): Promise<any> {
		const state = await contract.getState();
		const fs = require('fs');
		fs.writeFileSync(`./${field}.json`, JSON.stringify(state));
		return state && state[field as any];
	}

	async getResolverRecordsStructure(
		resolverAddress: string,
	): Promise<ResolverRecordsStructure> {
		if (resolverAddress == NULL_ADDRESS) {
			return {};
		}
		const resolver = this.zilliqa.contracts.at(
			toChecksumAddress(resolverAddress),
		);
		const resolverRecords =
			((await this.getContractField(
				resolver,
				'records',
			)) as any);
		const result = {};
		Object.keys(resolverRecords).forEach(recordKey => {
			_.set(result, recordKey, resolverRecords[recordKey]);
		})
		// resolverRecords.forEach(record => {
		// 	_.set(result, record.key, record.val);
		// });
		return result;
	}

	async resolve(domain: string | undefined): Promise<ZNSResolve | null> {
		const nodeHash = namehash(domain);
		const registryRecords = await this.getContractField(
			this.registry,
			'records',
		);

		if (!registryRecords) return null;
		const registryRecord = registryRecords[nodeHash]
		if (!registryRecord) return null;
		const [ownerAddress, resolverAddress] = registryRecord.arguments as [
			string,
			string
		];
		const resolution = await this.getResolverRecordsStructure(resolverAddress);
		const addresses = _.mapValues(resolution.crypto, 'address');
		return {
			addresses,
			meta: {
				owner: ownerAddress || null,
				type: 'zns',
				ttl: parseInt(resolution.ttl as string) || 0,
			},
		};
	}
}
