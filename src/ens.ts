import * as _ from 'lodash';
import { default as ensInterface } from './ens/contract/ens';
import { default as registrarInterface } from './ens/contract/registrar';
import { default as deedInterface } from './ens/contract/deed';
import { default as resolverInterface } from './ens/contract/resolver';
import { hash } from 'eth-ens-namehash';
import { EnsSourceDefinition } from './types';

const Web3 = require('web3');

const NullAddress = '0x0000000000000000000000000000000000000000';
const DefaultUrl = 'https://mainnet.infura.io/ws';

const NetworkIdMap = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'kovan',
  42: 'rinkeby',
  5: 'goerli',
};

const RegistryMap = {
  // Mainnet
  '1': '0x314159265dd8dbb310642f98f50c066173c1259b',
  // Ropsten
  '3': '0x112234455c3a32fd11230c42e7bccd4a84e02010',
};

export default class Ens {
  private ensContract: any;
  private registrarContract: any;
  private web3: any;
  private network: string | number;
  private registryAddress: string;

  constructor(source: string | boolean | EnsSourceDefinition = true) {
    source = this.normalizeSource(source);
    this.web3 = new Web3(source.url);
    this.network = source.network;
    if (!this.network) {
      throw new Error('Unspecified network in Namicorn ENS configuration');
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

  async reverse(address: string, currencyTicker: string) {
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

  async resolve(domain) {
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

  private normalizeSource(
    source: string | boolean | EnsSourceDefinition,
  ): EnsSourceDefinition {
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
        source = _.clone(source) as EnsSourceDefinition;
        if (typeof(source.network) == "string") {
          source.network = parseInt(_.invert(NetworkIdMap)[source.network])
        }
        if (source.network && !source.url) {
          source.url = NetworkIdMap[source.network.toString()];
        }
        if (source.url && !source.network) {
          source.network = this.networkFromUrl(source.url);
        }
        return source;
      }
    }
  }

  private networkFromUrl(url: string): number {
    return parseInt(_.findKey(NetworkIdMap, host => url.indexOf(host) >= 0));
  }
}
