import { hexToBytes } from '.';
import { keccak256 as sha3 } from 'js-sha3';
import { recover } from './recoverSignature';
import Cns from '../Cns';

export const isValidTwitterSignature = async (
  domain: string,
  owner: string,
  twitterHandle: string,
  validationSignature: string,
) => {
  const message = [domain, owner, 'social.twitter.username', twitterHandle]
    .map((value: string) => {
      if (/^0x/i.test(value)) {
        return '0x' + sha3(hexToBytes(value));
      }
      return '0x' + sha3(value);
    })
    .reduce((message, hashedValue) => message + hashedValue, '');
  const signerAddress = recover(message, validationSignature);
  if (signerAddress !== Cns.TwitterVerificationAddress) {
    return false;
  }
  return true;
};
