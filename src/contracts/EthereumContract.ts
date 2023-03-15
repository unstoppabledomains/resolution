import {Interface, JsonFragment, Result} from '@ethersproject/abi';
import {RequestArguments, EventData} from '../types';
import {Provider} from '../types/publicTypes';

export default class EthereumContract {
  readonly abi: JsonFragment[];
  readonly coder: Interface;
  readonly address: string;
  readonly provider: Provider;
  readonly apiKey?: string;

  constructor(
    abi: JsonFragment[],
    address: string,
    provider: Provider,
    apiKey?: string,
  ) {
    this.abi = abi;
    this.address = address;
    this.provider = provider;
    this.coder = new Interface(this.abi);
    this.apiKey = apiKey;
  }

  async call(
    method: string,
    args: (string | string[])[],
  ): Promise<ReadonlyArray<any>> {
    const inputParam = this.coder.encodeFunctionData(method, args);
    const response = (await this.callEth(inputParam)) as string;
    if (!response || response === '0x') {
      return [];
    }

    return this.coder.decodeFunctionResult(method, response);
  }

  async multicall(
    callArgs: {
      method: string;
      args: (string | string[])[];
    }[],
  ): Promise<ReadonlyArray<any>> {
    const methods: string[] = [];
    for (const call of callArgs) {
      methods.push(this.coder.encodeFunctionData(call.method, call.args));
    }
    const inputParam = this.coder.encodeFunctionData('multicall', [methods]);
    const response = (await this.callEth(inputParam)) as string;
    if (!response || response === '0x') {
      return [];
    }

    const multicallResult = this.coder.decodeFunctionResult(
      'multicall',
      response,
    );
    const results: Result[] = [];
    for (let i = 0; i < multicallResult.results.length; i++) {
      results.push(
        this.coder.decodeFunctionResult(
          callArgs[i].method,
          multicallResult.results[i],
        ),
      );
    }
    return results;
  }

  async fetchLogs(
    eventName: string,
    tokenId: string,
    fromBlock = 'earliest',
  ): Promise<EventData[]> {
    const topic = this.coder.getEventTopic(eventName);
    const params = [
      {
        fromBlock,
        toBlock: 'latest',
        address: this.address,
        topics: [topic, tokenId],
      },
    ];
    const request: RequestArguments = {
      method: 'eth_getLogs',
      params,
      apiKey: this.apiKey,
    };
    return (await this.provider.request(request)) as Promise<EventData[]>;
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
      apiKey: this.apiKey,
    };
    return await this.provider.request(request);
  }
}
