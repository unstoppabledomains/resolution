import { default as ensInterface } from './ens/contract/ens';
import { default as registrarInterface } from './ens/contract/registrar';
import { default as deedInterface } from './ens/contract/deed';
import { default as resolverInterface } from './ens/contract/resolver';
import { hash } from 'eth-ens-namehash';

const Web3 = require('web3');

const NullAddress = '0x0000000000000000000000000000000000000000';
const DefaultSource = 'https://mainnet.infura.io/ws';

interface SourceDefinition {
  url: string,
  network?: number,
}

export default class Ens {
  private ensContract: any;
  private registrarContract: any;
  private web3: any;

  constructor(source: string | boolean = true) {
    if (typeof(source) === "boolean") {
      source = DefaultSource;
    }
    this.web3 = new Web3(source);

    this.ensContract = new this.web3.eth.Contract(
      ensInterface,
      '0x314159265dD8dbb310642f98f50C066173C1259b',
    );
    this.registrarContract = new this.web3.eth.Contract(
      registrarInterface,
      '0x6090A6e47849629b7245Dfa1Ca21D94cd15878Ef',
    );
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
  /*===========================*/

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

  async fetchPreviousOwner(domain) {
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

  isSupportedDomain(domain: string): boolean {
    return domain.indexOf('.') > 0 && /^.{1,}\.(eth|luxe|xyz|test)$/.test(domain);
  }
}
