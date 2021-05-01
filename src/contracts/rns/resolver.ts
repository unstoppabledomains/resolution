import {
  ResolutionError,
  ResolutionErrorCode,
} from '../../errors/resolutionError';
import { default as newResolver } from './newResolver';
import { default as oldResolver } from './oldResolver';
import { RskCoinIndex } from '../../types';
import { NamingServiceName } from '../../types/publicTypes';
import { JsonFragment } from '@ethersproject/abi';

export const OldResolverAddresses = [
  '0x4efd25e3d348f8f25a14fb7655fba6f72edfe93a',
  '0x99a12be4C89CbF6CFD11d1F2c029904a7B644368',
];

export default (addr: string, coinType?: string): JsonFragment[] => {
  if (coinType === undefined || coinType === RskCoinIndex) {
    // Old interface is only compatible to output the RSK address
    // New interface is compatible to that API
    // So we prefer old interface when currency is RSK
    return oldResolver;
  } else {
    if (OldResolverAddresses.includes(addr.toLowerCase())) {
      throw new ResolutionError(
        ResolutionErrorCode.IncorrectResolverInterface,
        { method: NamingServiceName.RNS },
      );
    }

    return newResolver;
  }
};
