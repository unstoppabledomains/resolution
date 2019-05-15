import {default as ensInterface} from './ens/contract/ens';
import {default as registrarInterface} from './ens/contract/registrar';
import {default as deedInterface} from './ens/contract/deed';
import {default as resolverInterface} from './ens/contract/resolver';
import {hash} from 'eth-ens-namehash';

const Web3 = require('web3');

const BLANK_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_SOURCE = 'wss://mainnet.infura.io/ws';

export default class Ens {
  ensContract: any;
  deedContract: any;
  resolverContract: any;
  registrarContract: any;
  web3: any;

  constructor(source: string | boolean = DEFAULT_SOURCE) {
    if (source == true) {
      source = DEFAULT_SOURCE;
    }
    this.web3 = new Web3(source);
    this.ensContract = new this.web3.eth.Contract(
      ensInterface,
      '0x314159265dD8dbb310642f98f50C066173C1259b',
    );
    this.deedContract = new this.web3.eth.Contract(deedInterface);
    this.resolverContract = new this.web3.eth.Contract(resolverInterface);
    this.registrarContract = new this.web3.eth.Contract(
      registrarInterface,
      '0x6090A6e47849629b7245Dfa1Ca21D94cd15878Ef',
    );
  }
  async resolve(domain) {
    const nodeHash = hash(domain);
    var [owner, ttl, resolver] = await Promise.all([
      this.ensContract.methods.owner(nodeHash).call(),
      this.ensContract.methods.ttl(nodeHash).call(),
      this.ensContract.methods.resolver(nodeHash).call(),
    ]);
    if (resolver == BLANK_ADDRESS) resolver = null;
    if (owner == BLANK_ADDRESS) owner = null;
    const address = await this.fetchAddress(resolver, nodeHash);
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
  async fetchAddress(resolver, nodeHash) {
    if (!resolver) {
      return null;
    }
    const currentResolverContract = this.resolverContract.clone();
    currentResolverContract.options.address = resolver;
    return await currentResolverContract.methods.addr(nodeHash).call();
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

    if (deedAddress === BLANK_ADDRESS) {
      return null;
    }

    const currentDeedContract = this.deedContract.clone();
    currentDeedContract.options.address = deedAddress;

    const previousOwner = currentDeedContract.methods.previousOwner().call();
    return previousOwner === BLANK_ADDRESS ? null : previousOwner;
  }
}
