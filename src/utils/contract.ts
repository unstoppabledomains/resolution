import BaseConnection from '../baseConnection';
import { Interface, JsonFragment } from '@ethersproject/abi';
import ResolutionError, { ResolutionErrorCode } from '../resolutionError';
import { isNullAddress, NamingServiceName, Web3Provider } from '../types';

type FourBytes = string;

/** @internal */
export default class Contract extends BaseConnection {
  readonly abi: JsonFragment[];
  readonly coder: Interface;
  readonly address: string;
  readonly url: string;
  readonly name: NamingServiceName;
  readonly web3Provider?: Web3Provider;

  constructor(
    name: NamingServiceName,
    url: string,
    abi,
    address: string,
    web3Provider?: Web3Provider,
  ) {
    super();
    this.name = name;
    this.url = url;
    this.abi = abi;
    this.address = address;
    this.web3Provider = web3Provider;
    this.coder = new Interface(this.abi);
  }

  async fetchMethod(method: string, args: string[]): Promise<any> {
    const inputParam = this.coder.encodeFunctionData(
      method,
      args,
    )
    const response = await this.fetchData(inputParam);
    if (response.error) {
      throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
        method: this.name,
      });
    }
    if (isNullAddress(response.result))
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: method,
        domain: args[0],
      });
    const {result} = response
    return this.coder.decodeFunctionResult(method, result)[0]
  }

  private async fetchData(data: string): Promise<any> {
    const params = [
      {
        data,
        to: this.address,
      },
      'latest',
    ];
    if (this.web3Provider) {
      return await this.web3Provider
        .sendAsync('eth_call', params)
        .then(resp => resp.json());
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
    return await response.json();
  }
}
