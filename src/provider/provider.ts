import { ResolutionError } from "..";
import keccak256 from 'keccak256';

export type FourBytes = string;
/**
 * Class to comnunicate with etherium blockchain via  given url
 */
export default class EnsProvider {
  private static instance: EnsProvider;
  readonly url?: string;
  readonly namingService?: string

  private constructor(url: string, namingService: string = 'ENS') {
    this.url = url;
    this.namingService = namingService
  }

  static getInstance(url?: string, namingService: string = 'ENS') {
    if (!this.instance) {
      this.instance = new EnsProvider(url, namingService);
    }
    return this.instance;
  }

  //?: Make this hash function here? 
  FourBytesHash(method: string): FourBytes {
    return keccak256(method).toString('hex').slice(0,10);
  }

}

