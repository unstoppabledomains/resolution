import _ from 'lodash';
import {EtheriumNamingService} from './namingService';
import { Contract } from 'web3-eth-contract';
import { NamingServiceSource, RegistryMap } from './types';
import { default as cnsInterface } from './cns/contract/cns';
import Web3 from 'web3';

/**
 * Class to support connection with Crypto naming service
 * @param network - network string such as
 * - mainnet
 * - ropsten
 * @param url - main api url such as
 * - https://mainnet.infura.io
 * @param registryAddress - address for a registry contract
 */
export default class Cns extends EtheriumNamingService {
  readonly network: string;
  readonly url: string;
  readonly registryAddress?: string;
  /** @ignore */
  private ensContract: any;
  /** @ignore */
  private registry?: Contract;
  /** @ignore */
  private web3: any;
  /** @ignore */
  readonly RegistryMap: RegistryMap = {
    mainnet: '0x4158485d4754D0F6D8D9b740bd37eD89b6891f35',
  };

 /**
   * Source object describing the network naming service operates on
   * @param source - if specified as a string will be used as main url, if omited then defaults are used
   * @throws ConfigurationError - when either network or url is setup incorrectly
   */
  constructor(source: NamingServiceSource = true) {
    super();
    source = this.normalizeSource(source);
    this.network = source.network as string;
    this.url = source.url;
    this.web3 = new Web3(source.url);

    if (!this.network) {
      throw new Error('Unspecified network in Namicorn CNS configuration');
    }
    if (!this.url) {
      throw new Error('Unspecified url in Namicorn CNS configuration');
    }
    this.registryAddress = source.registry
      ? source.registry
      : this.RegistryMap[this.network];
    if (this.registryAddress) {
      this.ensContract = new this.web3.eth.Contract(
        cnsInterface,
        this.registryAddress,
      );
    }
  }

  /**
   * Checks if the domain is in valid format
   * @param domain - domain name to be checked
   * @returns
   */
  isSupportedDomain(domain: string): boolean {
    return domain.indexOf('.') > 0 && /^.{1,}\.(crypto)$/.test(domain);
  }

  /**
   * Resolves the given domain
   * @async
   * @param domain - domain name to be resolved
   * @returns- Returns a promise that resolves in an object
   */
  resolve(domain: string): Promise<import("./types").NamicornResolution> {
    throw new Error("Method not implemented.");
  }

  /**
   * Produces ENS namehash
   * @param domain - domain to be hashed
   * @return ENS namehash of a domain
   */
  namehash(domain: string): string {
    throw new Error("Method not implemented.");
  }

 /**
   * Resolves domain to a specific cryptoAddress
   * @param domain - domain name to be resolved
   * @param currencyTicker currency ticker such as
   *  - ZIL
   *  - BTC
   *  - ETH
   * @returns - A promise that resolves in a string
   */
  address(domain: string, currencyTicker: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

   /**
   * @ignore
   * @param resolver - Resolver address
   * @param nodeHash - namehash of a domain name
   */
  protected fetchAddress(resolver: any, nodeHash: any) {
    throw new Error("Method not implemented.");
  }
}
