import BaseConnection from '../baseConnection';
import { defaultAbiCoder as AbiCoder } from './abicoder';
var keccak256 = require('js-sha3').keccak_256;
import ResolutionError, { ResolutionErrorCode } from '../errors/resolutionError';
import { isNullAddress, NamingServiceName, Provider, RequestArguments } from '../types';
import { FetchError } from 'node-fetch';

type FourBytes = string;

/** @internal */
export default class Contract extends BaseConnection {
  readonly contractInterface: [any];
  readonly address: string;
  readonly url: string;
  readonly name: NamingServiceName;
  readonly provider?: Provider;

  /**
   * @param contractInterface JSON-RPC interface of smartContract
   * @param address Contract's address
   */
  constructor(
    name: NamingServiceName,
    url: string,
    contractInterface,
    address: string,
    provider?: Provider,
  ) {
    super();
    this.name = name;
    this.url = url;
    this.contractInterface = contractInterface;
    this.address = address;
    this.provider = provider;
  }

  /**
   * Used to fetch a Contract method
   * @param method - method name
   * @param args - method args
   * @async
   */
  async fetchMethod(method: string, args: string[]): Promise<any> {
    const methodDescription = this.contractInterface.find(
      param => param.name === method && param.inputs.length === args.length,
    );
    const inputParam = this.encodeInput(methodDescription, args);
    const response = await this.fetchData(inputParam).catch((error) => {
      if (error instanceof FetchError) {
        throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
          method: this.name,
        });
      } else throw error;
    }) as string | null;
    if (isNullAddress(response))
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: method,
        domain: args[0],
      });
    const decoded = AbiCoder.decode(
      methodDescription.outputs,
      response,
    )[0];
    return decoded;
  }

  /**
   * This method is used to get the first 4 bytes of keccak256 hash of contract method signature.
   * required to make an appropriate read call to eth
   * @param method - method signature to hash
   * @returns a string that consist with 0x and 4 bytes in hex.
   */
  private fourBytesHash(method: string): FourBytes {
    return (
      '0x' +
      keccak256(method)
        .toString('hex')
        .slice(0, 8)
    );
  }

  private encodeInput(methodDescription, args): string {
    const functionName: string = methodDescription.name;
    const functionInputTypes: [string] = methodDescription.inputs.map(
      input => input.type,
    );
    const methodSignature: string = `${functionName}(${functionInputTypes.join(
      ',',
    )})`;
    const initialBytes: FourBytes = this.fourBytesHash(methodSignature);
    return (
      initialBytes +
      AbiCoder.encode(methodDescription.inputs, args).replace('0x', '')
    );
  }

  private async fetchData(data: string): Promise<unknown> {
    const params = [
      {
        data,
        to: this.address,
      },
      'latest',
    ] as const;
    if (this.provider) {
      const request: RequestArguments = {
        method: 'eth_call',
        params
      };
      return await this.provider
      .request(request);
    }
    const response = await this.fetch(this.url, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const responsejson =  await response.json();
    return responsejson.result;
  }
}
