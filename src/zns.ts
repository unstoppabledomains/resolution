import { Zilliqa } from '@zilliqa-js/zilliqa';
import { Contract } from '@zilliqa-js/contract';
import { toChecksumAddress } from '@zilliqa-js/crypto';
import namehash from './zns/namehash';
import _ from 'lodash';

const DEFAULT_SOURCE = 'https://api.zilliqa.com/';
const registryAddress = 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz';
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

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
    return state && state.find(v => v.vname === field).value;
  }

  async getResolverRecordsStructure(resolverAddress: string) {
    if (resolverAddress == NULL_ADDRESS) {
      return {};
    }
    const resolver = this.zilliqa.contracts.at(
      toChecksumAddress(resolverAddress),
    );
    const resolverRecords =
      ((await this.getContractField(resolver, 'records')) as Array<{
        key;
        val;
      }>) || [];
    const result = {};
    resolverRecords.forEach(record => {
      _.set(result, record.key, record.val);
    });
    return result;
  }

  async resolve(domain) {
    const nodeHash = namehash(domain);
    const registryRecords = await this.getContractField(
      this.registry,
      'records',
    );

    if (!registryRecords) return null;
    const registryRecord = registryRecords.find(r => r.key == nodeHash);
    if (!registryRecord) return null;
    const [ownerAddress, resolverAddress] = registryRecord.val.arguments as [
      string,
      string
    ];
    const resolution = (await this.getResolverRecordsStructure(
      resolverAddress,
    )) as { crypto?: Array<{ address? }>; ttl? };
    const addresses = _.mapValues(resolution.crypto, 'address');

    return {
      addresses,
      meta: {
        owner: ownerAddress || null,
        type: 'zns',
        ttl: parseInt(resolution.ttl) || 0,
      },
    };
  }
}
