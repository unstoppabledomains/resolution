import { ResolutionError, ResolutionErrorCode } from '../../resolutionError';
import { default as newResolver } from './newResolver';
import { default as oldResolver } from './oldResolver';
import { EthCoinIndex, NamingServiceName } from '../../types';

const oldResolverAddress =  '0x1da022710df5002339274aadee8d58218e9d6ab5';
const newResolverAddress = '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8';

export default (addr: string, coinType?: number) => {
  switch(addr) {
    case oldResolverAddress: {
      if (coinType !== EthCoinIndex) {
        throw new ResolutionError(ResolutionErrorCode.IncorrectResolverInterface, {method: NamingServiceName.ENS});
      }
      return oldResolver;
    }
    case newResolverAddress: {
     return newResolver;
    }
    default: {
      return newResolver;
    }
  }
}
