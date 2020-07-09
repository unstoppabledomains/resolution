import nock from 'nock';
import { Dictionary } from '../types';
import { ResolutionError } from '../index';
import mockData from '../testData/mockData.json';

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
    if (value instanceof Error) {
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
) {
  try {
    if (callback instanceof Function) {
      callback = callback();
    }
    await callback;
  } catch (error) {
    if (error instanceof ResolutionError && error.code === code) {
      return expect(error.code).toEqual(code);
    } else {
      throw error;
    }
  }
  fail("Expected resolution error to be thrown but wasn't");
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
export function secretInfuraLink(): string {
  const secret = process.env.UNSTOPPABLE_RESOLUTION_INFURA_PROJECTID;
  let url = 'https://mainnet.infura.io';
  if (secret) url = `https://mainnet.infura.io/v3/${secret}`;
  return url;
}
