import keccak256 from 'keccak256';

export type FourBytes = string;

/** @internal */
export default class EnsProvider {
  private static instance: EnsProvider;
  readonly url: string;
  readonly namingService: string

  private constructor(url: string, namingService: string) {
    this.url = url;
    this.namingService = namingService
  }

  /**
   * gets an Instance of EnsProvider
   * @param url - infura like url
   * @param namingService - name of namingService like ENS or CNS
   */
  static getInstance(url?: string, namingService: string = 'ENS') {
    if (!this.instance) {
      this.instance = new EnsProvider(url, namingService);
    }
    return this.instance;
  }

  /**
   * This method is used to get the first 4 bytes of keccak256 hash of contract method signature.
   * required to make an appropriate read call to eth
   * @param method - method signature to hash
   * @returns a string that consist with 0x and 4 bytes in hex.
   */
  FourBytesHash(method: string): FourBytes {
    return '0x' + keccak256(method).toString('hex').slice(0,8);
  }
}

