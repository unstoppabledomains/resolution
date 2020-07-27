import nock from 'nock';
import _ from 'lodash';
import { Dictionary } from '../types';
import { ResolutionError } from '../index';
import mockData from './mockData.json';
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
  code: string,
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
    () => fail("Expected resolution error to be thrown but wasn't"),
    (error) => {
      if (error instanceof ResolutionError && error.code === code) {
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
          .post('/', JSON.stringify(REQUEST))
          .reply(200, JSON.stringify(RESPONSE));
      }
      default: {
        nock(url)
          // .log()
          .get(REQUEST as string)
          .reply(200, RESPONSE);
      }
    }
  });
}

/**
 * @internal
 * returns either a standard mainnet infura url
 * or the one with attached INFURA SECRET key from
 * UNSTOPPABLE_RESOLUTION_INFURA_PROJECTID env variable if any
 */
export function secretInfuraLink(infuraProtocol: InfuraProtocol = InfuraProtocol.http): string {
  const secret = process.env.UNSTOPPABLE_RESOLUTION_INFURA_PROJECTID;
  const protocolMap = {
    [InfuraProtocol.http]:'https://mainnet.infura.io/v3',
    [InfuraProtocol.wss]:'wss://mainnet.infura.io/ws/v3'
  };
  const url = `${protocolMap[infuraProtocol]}/${secret}`;
  return url;
}

export enum InfuraProtocol {
  "http", "wss"
};

export const caseMock = <T, U>(params: T, cases: readonly (readonly [T, U])[]): U => {
  for (const [variant, result] of cases) {
    if (_.isEqual(params, variant)) {
      return result;
    }
  }
  throw new Error(`got unexpected params ${JSON.stringify(params)}`);
}
