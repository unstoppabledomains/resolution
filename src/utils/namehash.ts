import sha256 from 'crypto-js/sha256';
import sha3 from 'crypto-js/sha3';
import hex from 'crypto-js/enc-hex';
import WordArray from 'crypto-js/lib-typedarrays';
import BN from 'bn.js';

export function eip137Namehash(domain: string): string {
  const arr = hashArray(domain, 'sha3');
  return arrayToHex(arr);
}

export function eip137Childhash(parentHash: string, label: string): string {
  return childhash(parentHash, label, 'sha3');
}

export function znsNamehash(domain: string): string {
  const arr = hashArray(domain, 'sha256');
  return arrayToHex(arr);
}

export function znsChildhash(parentHash: string, label: string): string {
  return childhash(parentHash, label, 'sha256');
}

function childhash(
  parentHash: string,
  label: string,
  hashingAlgo: 'sha256' | 'sha3',
): string {
  const hash = hashingAlgo === 'sha256' ? sha256 : sha3;
  const opts = {outputLength: 256};
  const parent = parentHash.replace(/^0x/, '');
  const childHash = hex.stringify(hash(label, opts));
  return `0x${hex.stringify(hash(hex.parse(`${parent}${childHash}`), opts))}`;
}

function hashArray(domain: string, hashingAlgo: 'sha256' | 'sha3'): WordArray {
  if (!domain) {
    return WordArray.create(Array.from(new Uint8Array(8)));
  }

  const hash = hashingAlgo === 'sha256' ? sha256 : sha3;
  const opts = {outputLength: 256};

  const [label, ...remainder] = domain.split('.');
  const labelHash = hash(label, opts);
  const remainderHash = hashArray(remainder.join('.'), hashingAlgo);
  return hash(remainderHash.concat(labelHash), opts);
}

function arrayToHex(arr: WordArray) {
  return `0x${hex.stringify(arr)}`;
}

export function fromHexStringToDecimals(value: string): string {
  if (value.startsWith('0x')) {
    const valueWithoutPrefix = value.slice(2, value.length);
    const bn = new BN(valueWithoutPrefix, 16);
    return bn.toString(10);
  }

  return value;
}

export function fromDecStringToHex(value: string): string {
  if (!value.startsWith('0x')) {
    const bn = new BN(value, 10);
    const bnString = bn.toString(16);
    return `0x${bnString.padStart(64, '0')}`;
  }

  return value;
}
