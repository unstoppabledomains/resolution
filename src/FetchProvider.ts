import { FetchError } from 'node-fetch';
import BaseConnection from './BaseConnection';
import { RequestArguments } from './types';
import ResolutionError, { ResolutionErrorCode } from './errors/resolutionError';
import { Provider, ResolutionMethod } from './publicTypes';

export default class FetchProvider extends BaseConnection implements Provider {
  readonly url: string;
  readonly name: ResolutionMethod;

  constructor(name: ResolutionMethod, url: string) {
    super();
    this.url = url;
    this.name = name;
  }

  async request(args: RequestArguments): Promise<unknown> {
    try {
      const response = await this.fetch(this.url, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: args.method,
          params: args.params || [],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const json = await response.json();
      if (json.error) {
        throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
          providerMessage: json.error.message,
        });
      }
      return json.result;
    } catch (error) {
      if (error instanceof FetchError) {
        throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
          method: this.name,
        });
      } else {
        throw error;
      }
    }
  }
}
