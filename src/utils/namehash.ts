import {Hash, keccak_256 as sha3} from 'js-sha3';
import {sha256} from 'js-sha256';
import {Buffer} from 'buffer';
import BN from 'bn.js';

export function eip137Namehash(domain: string): string {
  const arr = hashArray(domain, sha3);
  return arrayToHex(arr);
}

export function eip137Childhash(parentHash: string, label: string): string {
  return childhash(parentHash, label, sha3);
}

export function znsNamehash(domain: string): string {
  const arr = hashArray(domain, sha256);
  return arrayToHex(arr);
}

export function znsChildhash(parentHash: string, label: string): string {
  return childhash(parentHash, label, sha256);
}

function childhash(
  parentHash: string,
  label: string,
  hashingAlgo: Hash,
): string {
  const parent = parentHash.replace(/^0x/, '');
  const childHash = hashingAlgo.hex(label);
  return `0x${hashingAlgo.hex(Buffer.from(`${parent}${childHash}`, 'hex'))}`;
}

function hashArray(domain: string, hashingAlgo: Hash): number[] {
  if (!domain) {
    return Array.from(new Uint8Array(32));
  }

  const [label, ...remainder] = domain.split('.');
  const labelHash = hashingAlgo.array(label);
  const remainderHash = hashArray(remainder.join('.'), hashingAlgo);
  return hashingAlgo.array(new Uint8Array([...remainderHash, ...labelHash]));
}

function arrayToHex(arr: number[]) {
  return `0x${Array.prototype.map
    .call(arr, (x) => ('00' + x.toString(16)).slice(-2))
    .join('')}`;
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
    return `0x${bn.toString(16)}`;
  }

  return value;
}
