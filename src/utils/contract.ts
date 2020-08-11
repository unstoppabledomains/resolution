import ResolutionError, { ResolutionErrorCode } from '../errors/resolutionError';
import { Interface, JsonFragment } from '@ethersproject/abi';
import { isNullAddress, Provider, RequestArguments, EventData } from '../types';

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

  async fetchMethod(method: string, args: (string | string [])[]): Promise<any> {
    const inputParam = this.coder.encodeFunctionData(
      method,
      args,
    )
    const response = await this.fetchData(inputParam) as string | null;
    if (isNullAddress(response))
      throw new ResolutionError(ResolutionErrorCode.RecordNotFound, {
        recordName: method,
        domain: args[args.length - 1] as string,
      });
    return this.coder.decodeFunctionResult(method, response)[0]
  }

  async fetchLogs(eventName: string, tokenId: string): Promise<EventData[]> {
    const topic = this.coder.getEventTopic(eventName);
    const params = [
      {
        fromBlock: "0x960844",
        toBlock: "latest",
        address: this.address,
        topics: [topic, tokenId,]
      }
    ]
    const request: RequestArguments = {
      method: 'eth_getLogs',
      params
    };

  return await this.provider.request(request) as Promise<EventData[]>;
  }

  private async fetchData(data: string): Promise<unknown> {
    const params = [
      {
        data,
        to: this.address,
      },
      'latest',
    ];
    const request: RequestArguments = {
      method: 'eth_call',
      params
    };
    return await this.provider.request(request);
  }
}
