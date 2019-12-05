import {Dictionary } from '../types';
import {ResolutionError} from '../index';

export function mockAsyncMethod(object: any, method: string, value) {
  if (!process.env.LIVE)
    return jest.spyOn(object, method).mockResolvedValue(value);
  else return jest.spyOn(object, method);
};

export function mockAsyncMethods(object: any, methods: Dictionary<any>) {
  return Object.entries(methods).map(method =>
    mockAsyncMethod(object, method[0], method[1]),
  );
};

export function expectSpyToBeCalled (spies: any[]) {
  if (!process.env.LIVE) {
    spies.forEach(spy => expect(spy).toBeCalled());
  }
};

export async function expectResolutionErrorCode (
  callback: Promise<any> | Function,
  code: string,
) {
  try {
    if (callback instanceof Promise) {
      await callback;
    } else {
      callback();
    }
  } catch (error) {
    if (error instanceof ResolutionError) {
      return expect(error.code).toEqual(code);
    } else {
      throw error;
    }
  }
  expect(true).toBeFalsy();
};
