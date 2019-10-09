import _ from 'lodash';
import { default as ensInterface } from './ens/contract/ens';
import { default as registrarInterface } from './ens/contract/registrar';
import { default as deedInterface } from './ens/contract/deed';
import { default as resolverInterface } from './ens/contract/resolver';
import { hash } from 'eth-ens-namehash';
import { SourceDefinition, ResolutionResult, NameService } from './types';
import NamingService from './namingService';
const Web3 = require('web3');

const NullAddress = '0x0000000000000000000000000000000000000000';
const DefaultUrl = 'https://mainnet.infura.io';

const NetworkIdMap = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'kovan',
  42: 'rinkeby',
  5: 'goerli',
};
const NetworkNameMap = _(NetworkIdMap)
  .invert()
  .mapValues((v, k) => parseInt(v))
  .value();

const RegistryMap = {
  mainnet: '0x314159265dd8dbb310642f98f50c066173c1259b',
  ropsten: '0x112234455c3a32fd11230c42e7bccd4a84e02010',
};

export default class Ens extends NamingService {
  readonly network: string;
  readonly url: string;
  private ensContract: any;
  private registrarContract: any;
  private web3: any;
  private registryAddress: string;

  // NamingService.normalizeSourceDefinition
  normalizeSourceDefinition(
    source: string | boolean | SourceDefinition,
  ): SourceDefinition {
    switch (typeof source) {
      case 'boolean': {
        return { url: DefaultUrl, network: this.networkFromUrl(DefaultUrl) };
      }
      case 'string': {
        return {
          url: source as string,
          network: this.networkFromUrl(source as string),
        };
      }
      case 'object': {
        source = _.clone(source) as SourceDefinition;
        if (typeof source.network == 'number') {
          source.network = NetworkIdMap[source.network];
        }
        if (source.network && !source.url) {
          source.url = `https://${source.network}.infura.io`;
        }
        if (source.url && !source.network) {
          source.network = this.networkFromUrl(source.url);
        }
        return source;
      }
    }
  }

  constructor(source: string | boolean | SourceDefinition = true) {
    super();
    source = this.normalizeSource(source);
    this.web3 = new Web3(source.url);
    this.network = <string>source.network;
    this.url = source.url;
    if (!this.network) {
      throw new Error('Unspecified network in Namicorn ENS configuration');
    }
    if (!this.url) {
      throw new Error('Unspecified url in Namicorn ENS configuration');
    }
    this.registryAddress = RegistryMap[this.network];
    if (this.registryAddress) {
      this.ensContract = new this.web3.eth.Contract(
        ensInterface,
        this.registryAddress,
      );
      this.registrarContract = new this.web3.eth.Contract(
        registrarInterface,
        //TODO: make an address dependent on network id
        '0x6090A6e47849629b7245Dfa1Ca21D94cd15878Ef',
      );
    }
  }

  isSupportedDomain(domain: string): boolean {
    return (
      domain.indexOf('.') > 0 && /^.{1,}\.(eth|luxe|xyz|test)$/.test(domain)
    );
  }

  isSupportedNetwork(): boolean {
    return this.registryAddress != null;
  }

  async reverse(address: string, currencyTicker: string): Promise<string> {
    if (currencyTicker != 'ETH') {
      throw new Error(`Ens doesn't support any currency other than ETH`);
    }
    if (address.startsWith('0x')) {
      address = address.substr(2);
    }
    const reverseAddress = address + '.addr.reverse';
    const nodeHash = hash(reverseAddress);
    const resolverAddress = await this._getResolver(nodeHash);
    if (resolverAddress == NullAddress) {
      return null;
    }
    const resolverContract = new this.web3.eth.Contract(
      resolverInterface,
      resolverAddress,
    );

    return await this._resolverCallToName(resolverContract, nodeHash);
  }

  async resolve(domain: string): Promise<ResolutionResult | null> {
    if (!this.isSupportedDomain(domain) || !this.isSupportedNetwork()) {
      return null;
    }
    const nodeHash = hash(domain);
    var [owner, ttl, resolver] = await this._getResolutionInfo(nodeHash);
    if (owner == NullAddress) owner = null;
    const address = await this._fetchAddress(resolver, nodeHash);
    return {
      addresses: {
        ETH: address,
      },
      meta: {
        owner,
        type: 'ens',
        ttl: Number(ttl),
      },
    };
  }

  /* Test functions bellow */

  _resolverCallToName(resolverContract, nodeHash) {
    return resolverContract.methods.name(nodeHash).call();
  }

  _getResolver(nodeHash) {
    return this.ensContract.methods.resolver(nodeHash).call();
  }

  async _getResolutionInfo(nodeHash) {
    return await Promise.all([
      this.ensContract.methods.owner(nodeHash).call(),
      this.ensContract.methods.ttl(nodeHash).call(),
      this.ensContract.methods.resolver(nodeHash).call(),
    ]);
  }

  async _fetchAddress(resolver, nodeHash) {
    if (!resolver || resolver == NullAddress) {
      return null;
    }
    const resolverContract = new this.web3.eth.Contract(
      resolverInterface,
      resolver,
    );
    //put it as a separate method to stub.
    const address = await resolverContract.methods.addr(nodeHash).call();
    return address;
  }
  /*===========================*/

  private async fetchPreviousOwner(domain) {
    var labelHash = this.web3.utils.sha3(domain.split('.')[0]);

    const [
      mode,
      deedAddress,
      registrationDateSeconds,
      value,
      highestBid,
    ] = await this.registrarContract.methods.entries(labelHash).call();

    if (deedAddress === NullAddress) {
      return null;
    }

    const deedContract = new this.web3.eth.Contract(deedInterface, deedAddress);

    const previousOwner = deedContract.methods.previousOwner().call();
    return previousOwner === NullAddress ? null : previousOwner;
  }

  private networkFromUrl(url: string): string {
    return _.find(NetworkIdMap, name => url.indexOf(name) >= 0);
  }
}
