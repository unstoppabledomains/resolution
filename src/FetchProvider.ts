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
    const json = await this.fetchJson(args);
    if (json.error) {
      throw new ResolutionError(ResolutionErrorCode.ServiceProviderError, {
        providerMessage: json.error.message,
      });
    }
    return json.result;
  }

  protected async fetchJson(args: RequestArguments): Promise<{error: {message: string}, result: undefined} | {error: undefined, result: unknown}> {
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
      return await response.json();
    } catch (error) {
      switch(this.getEnv()) {
      case "NODE": {
        if (error instanceof FetchError) {
          throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
            method: this.name,
          });
        }
        break ;
      }
      case "BROWSER": {
        if (error.name === "TypeError") {
          throw new ResolutionError(ResolutionErrorCode.NamingServiceDown, {
            method: this.name,
          });
        }
        break ;
      }
      }
      throw error;
    }
  }
}
