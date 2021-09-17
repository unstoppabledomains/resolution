import crossFetch from 'cross-fetch';

export default class Networking {
  static async fetch(
    url: string,
    options: {body?: string; headers?: Record<string, string>; method?: string},
  ): Promise<Response> {
    return crossFetch(url, options);
  }
}
