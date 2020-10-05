import { Interface, JsonFragment } from '@ethersproject/abi';
import { RequestArguments, EventData } from '../types';
import { Provider } from '../publicTypes';

/** @internal */
const CRYPTO_RESOLVER_ADVANCED_EVENTS_STARTING_BLOCK = "0x960844";


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

  async fetchLogs(eventName: string, tokenId: string): Promise<EventData[]> {
    const topic = this.coder.getEventTopic(eventName);
    const startingBlockNumber = await this.getStartingBlock(tokenId);
    const params = [
      {
        fromBlock: startingBlockNumber,
        toBlock: 'latest',
        address: this.address,
        topics: [topic, tokenId]
      }
    ]
    const request: RequestArguments = {
      method: 'eth_getLogs',
      params
    };
    return await this.provider.request(request) as Promise<EventData[]>;
  }

  private async getStartingBlock(tokenId: string) {
    const topic = this.coder.getEventTopic("ResetRecords");
    const params = [
      {
        fromBlock: 'earliest',
        toBlock: 'latest',
        topics: [topic, tokenId],
        address: this.address
      }
    ];

    const request: RequestArguments = {
      method: 'eth_getLogs',
      params
    };
    const logs = await this.provider.request(request) as EventData[];
    const lastResetEvent = logs[logs.length - 1];
    return lastResetEvent?.blockNumber || CRYPTO_RESOLVER_ADVANCED_EVENTS_STARTING_BLOCK;
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
