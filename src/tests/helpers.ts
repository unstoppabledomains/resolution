import nock from 'nock';
import _ from 'lodash';
import { Dictionary } from '../types';
import mockData from './mockData.json';
import ResolutionError, { ResolutionErrorCode } from '../errors/resolutionError';
import ConfigurationError, { ConfigurationErrorCode } from '../errors/configurationError';
export const MainnetUrl = 'https://mainnet.infura.io';
export const ZilliqaUrl = 'https://api.zilliqa.com';
export const DefaultUrl = 'https://unstoppabledomains.com/api/v1';

export const CryptoDomainWithoutResolver = 'reseller-test-paul1.crypto';
export const CryptoDomainWithEmptyResolver = 'reseller-test-mago017.crypto'
export const CryptoDomainWithIpfsRecords = 'reseller-test-paul019.crypto'
export const CryptoDomainWithEmail = 'reseller-test-paul019.crypto'
export const CryptoDomainWithAdaBchAddresses = 'reseller-test-mago0.crypto';

export function mockAsyncMethod(object: any, method: string, value) {
  const spy = jest.spyOn(object, method);
  if (!process.env.LIVE) {
    if (value instanceof Function) {
      return spy.mockImplementation(value)
    } else if (value instanceof Error) {
      return spy.mockRejectedValue(value);
    } else {
      return spy.mockResolvedValue(value);
    }
  }
  return spy;
}

export function mockAsyncMethods(object: any, methods: Dictionary<any>) {
  return Object.entries(methods).map(method =>
    mockAsyncMethod(object, method[0], method[1]),
  );
}

export function isLive() {
  return !!process.env.LIVE
}

export function pendingInLive() {
  if (isLive()) {
    pending("Disabled in LIVE mode")
  }
}

export function expectSpyToBeCalled(spies: any[]) {
  if (!isLive()) {
    spies.forEach(spy => expect(spy).toBeCalled());
  }
}

export async function expectResolutionErrorCode(
  callback: Promise<any> | Function,
  code: ResolutionErrorCode
): Promise<void> {
  return expectError(callback, code, ResolutionError)
}

export async function expectConfigurationErrorCode(
  callback: Promise<any> | Function,
  code: ConfigurationErrorCode
): Promise<void> {
  return expectError(callback, code, ConfigurationError)
}

async function expectError(
  callback: Promise<any> | Function,
  code: string,
  klass: typeof ResolutionError | typeof ConfigurationError
): Promise<void> {
  if (callback instanceof Function) {
    callback = new Promise((resolve, reject) => {
      const result = (callback as Function)();
      if (result instanceof Promise) {
        result.then(resolve, reject)
      } else {
        resolve(result);
      }
    });
  }

  return callback.then(
    () => fail(`Expected ${klass.name} to be thrown but wasn't`),
    (error) => {
      // Redundant code quality check is required
      // to display stack traces when code is incorrect
      if (error instanceof klass && error.code === code) {
        return expect(error.code).toEqual(code);
      } else {
        throw error;
      }
    }
  );
}

export function mockAPICalls(testName: string, url = MainnetUrl) {
  if (isLive()) {
    return;
  }
  const mcdt = mockData as any;
  const mockCall = mcdt[testName] as [any];

  mockCall.forEach(({ METHOD, REQUEST, RESPONSE }) => {
    switch (METHOD) {
      case 'POST': {
        nock(url)
          // .log()
          .post('/', JSON.stringify(REQUEST), undefined)
          .reply(200, JSON.stringify(RESPONSE));
      }
      default: {
        nock(url)
          // .log()
          .get(REQUEST as string, undefined, undefined)
          .reply(200, RESPONSE);
      }
    }
  });
}

/**
 * @internal
 * returns either a standard mainnet linkpool url
 * @see https://docs.linkpool.io/docs/rpc_main
 * or the one with attached INFURA SECRET key from
 * UNSTOPPABLE_RESOLUTION_INFURA_PROJECTID env variable if any
 */
export function protocolLink(providerProtocol: ProviderProtocol = ProviderProtocol.http): string {
  const secret = process.env.UNSTOPPABLE_RESOLUTION_INFURA_PROJECTID;
  const protocolMap = {
    [ProviderProtocol.http]: secret ? `https://mainnet.infura.io/v3/${secret}` : 'https://main-rpc.linkpool.io',
    [ProviderProtocol.wss]: secret ? `wss://mainnet.infura.io/ws/v3/${secret}` : 'wss://main-rpc.linkpool.io/ws',
 };
  const url = protocolMap[providerProtocol];
  return url;
}

export enum ProviderProtocol {
  "http", "wss"
};

export const caseMock = <T, U>(params: T, cases: { request: T, response: U }[]): U => {
  for (const {request, response} of cases) {
    if (_.isEqual(params, request)) {
      return response;
    }
  }
  throw new Error(`got unexpected params ${JSON.stringify(params)}`);
}
