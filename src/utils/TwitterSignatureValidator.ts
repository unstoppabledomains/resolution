import {hexToBytes} from './index';
import {keccak256 as sha3} from 'js-sha3';
import {recover} from './recoverSignature';
import {fromHexStringToDecimals} from './namehash';

const TwitterVerificationAddress = '0x12cfb13522F13a78b650a8bCbFCf50b7CB899d82';

export const isValidTwitterSignature = ({
  tokenId,
  owner,
  twitterHandle,
  validationSignature,
}: {
  tokenId: string;
  owner: string;
  twitterHandle: string;
  validationSignature: string;
}): boolean => {
  const tokenIdInDecimals = fromHexStringToDecimals(tokenId);
  const message = [
    tokenIdInDecimals,
    owner,
    'social.twitter.username',
    twitterHandle,
  ]
    .map(
      (value: string) =>
        '0x' + sha3(value.startsWith('0x') ? hexToBytes(value) : value),
    )
    .reduce((message, hashedValue) => message + hashedValue, '');
  const signerAddress = recover(message, validationSignature);
  return signerAddress === TwitterVerificationAddress;
};
