
import { domainEndingToNS } from './index';
import { NamingServiceName } from '../publicTypes';
import ResolutionError from '../errors/resolutionError';
import { ResolutionErrorCode } from '../errors/resolutionError';
import { keccak_256 as sha3 } from 'js-sha3';
import { sha256 } from 'js-sha256';

/**
 * @internal
 * This is a helper class for CNS ENS and ZNS for organize namehashing purpose
 */
export default class Namehash {

  static hash(domain: string): string {
    const serviceName = domainEndingToNS[domain.split(".").pop() || ''];
    switch(serviceName) {
      case NamingServiceName.CNS: 
        return this.cnsNamehash(domain);
      case NamingServiceName.ZNS:
        return this.znsNamehash(domain);
      case NamingServiceName.ENS:
        return this.ensNamehash(domain);
    }
    throw new ResolutionError(ResolutionErrorCode.UnsupportedDomain, { domain });
  }

  private static ensNamehash(domain: string): string {
    const hashArray = this.hashArray(domain, NamingServiceName.ENS);
    return this.arrayToHex(hashArray);
  }

  private static cnsNamehash(domain: string): string {
    const hashArray = this.hashArray(domain, NamingServiceName.CNS);
    return this.arrayToHex(hashArray);
  }

  private static znsNamehash(domain: string): string {
    const hashArray = this.hashArray(domain, NamingServiceName.ZNS);
    return this.arrayToHex(hashArray);  
  }

  private static hashArray(domain: string, type: NamingServiceName): number[] {
    if (!domain) {
      return Array.from(new Uint8Array(32));
    }
    const hashingAlgo = type === NamingServiceName.ZNS ? sha256 : sha3;

    const [label, ...remainder] = domain.split('.');
    const labelHash = hashingAlgo.array(label);
    const remainderHash = this.hashArray(remainder.join('.'), type);
    return hashingAlgo.array(new Uint8Array([...remainderHash, ...labelHash]));
  }

  private static arrayToHex(arr) {
    return '0x' + Array.prototype.map.call(arr, x => ('00' + x.toString(16)).slice(-2)).join('');
  }
} 