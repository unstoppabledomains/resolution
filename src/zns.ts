import { Zilliqa } from '@zilliqa-js/zilliqa';
import { Contract } from '@zilliqa-js/contract';
import { toChecksumAddress } from '@zilliqa-js/crypto';
import namehash from './zns/namehash';
import _ from 'lodash';
import { fstat } from 'fs';

const DefaultSource = 'https://api.zilliqa.com/';
const registryAddress = 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz';
const NullAddress = '0x0000000000000000000000000000000000000000';

type Resolution = {
  crypto?: { [key: string]: { address: string } };
  ttl?: string;
  [key: string]: any;
};


export default class {
  registry: Contract;
  zilliqa: Zilliqa;

  constructor(source: string | boolean = DefaultSource) {
    if (source == true) {
      source = DefaultSource;
    }
    source = source.toString();
    this.zilliqa = new Zilliqa(source);
    this.registry = this.zilliqa.contracts.at(registryAddress);
  }

  async getContractField(contract: Contract, field: string): Promise<any> {
    //let response = await this.zilliqa.provider.send("GetSmartContractSubState", contract.address, field);
    //return (response.result || {})[field];
    const state = await contract.getState();
    return state && state[field];
  }

  async getResolverRecordsStructure(
    resolverAddress: string,
  ): Promise<Resolution> {
    if (resolverAddress == NullAddress) {
      return {};
    }
    const resolver = this.zilliqa.contracts.at(
      toChecksumAddress(resolverAddress),
    );
    const resolverRecords = await this.getContractField(
      resolver,
      'records',
    ) as {[key: string]: string};
    return _.transform(resolverRecords,
      (result, value, key) =>  _.set(result, key, value),
      {},
    );
  }

  async resolve(domain: string): Promise<Resolution | null> {
    const nodeHash = namehash(domain);
    const registryRecords = await this.getContractField(
      this.registry,
      'records',
    );

    if (!registryRecords) return null;
    const registryRecord = registryRecords[nodeHash];
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
