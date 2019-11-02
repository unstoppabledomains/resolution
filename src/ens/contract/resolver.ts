import { ResolutionError } from "../..";
import {default as newResolver} from './newResolver';
import {default as oldResolver} from './oldResolver';

const oldResolverAddress =  '0x1da022710df5002339274aadee8d58218e9d6ab5';
const newResolverAddress = '0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8';

enum ETH_COINT_TYPE {
  ETH_COIN = 60
};
const defaultCoin:ETH_COINT_TYPE = 60;

export default (addr: string, coinType?: number) => {
  switch(addr) {
    case oldResolverAddress: {
      if (coinType !== defaultCoin) {
        throw new ResolutionError('IncorrectResolverInterface', {method: 'ETH'});
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
