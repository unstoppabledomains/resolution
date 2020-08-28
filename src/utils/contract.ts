import { Interface, JsonFragment } from '@ethersproject/abi';
import { Provider, RequestArguments } from '../types';

/** @internal */
export default class Contract {
  readonly abi: JsonFragment[];
  readonly coder: Interface;
  readonly address: string;
  readonly provider: Provider;

  constructor(
    abi,
    address: string,
    provider: Provider,
  ) {
    this.abi = abi;
    this.address = address;
    this.provider = provider;
    this.coder = new Interface(this.abi);
  }

  async call(method: string, args: (string | string[])[]): Promise<ReadonlyArray<any>> {
    const inputParam = this.coder.encodeFunctionData(method, args);
    const response = await this.callEth(inputParam) as string;
    if (!response || response === '0x') {
      return [];
    }

    return this.coder.decodeFunctionResult(method, response);
  }

  private async callEth(data: string): Promise<unknown> {
    const params = [
      {
        data,
        to: this.address,
      },
      'latest',
    ];
    const request: RequestArguments = {
      method: 'eth_call',
      params,
    };
    return await this.provider.request(request);
  }
}
