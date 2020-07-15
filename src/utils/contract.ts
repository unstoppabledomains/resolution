import BaseConnection from '../baseConnection';
import { FetchError } from 'node-fetch';
import ResolutionError, { ResolutionErrorCode } from '../errors/resolutionError';
import { Interface, JsonFragment } from '@ethersproject/abi';
import { isNullAddress, NamingServiceName, Provider, RequestArguments } from '../types';

type FourBytes = string;

/** @internal */
export default class Contract extends BaseConnection {
  readonly abi: JsonFragment[];
  readonly coder: Interface;
  readonly address: string;
  readonly url: string | undefined;
  readonly name: NamingServiceName;
  readonly provider?: Provider;

  constructor(
    name: NamingServiceName,
    url: string | undefined,
    abi,
    address: string,
    provider?: Provider,
  ) {
    super();
    this.name = name;
    this.url = url;
    this.abi = abi;
    this.address = address;
    this.provider = provider;
    this.coder = new Interface(this.abi);
  }

  async fetchMethod(method: string, args: string[]): Promise<any> {
    const inputParam = this.coder.encodeFunctionData(
      method,
      args,
    )
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
    return this.coder.decodeFunctionResult(method, response)[0]
  }

  private async fetchData(data: string): Promise<unknown> {
    const params = [
      {
        data,
        to: this.address,
      },
      'latest',
    ];
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
