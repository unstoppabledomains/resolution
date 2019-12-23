import {keccak_256 as sha3} from 'js-sha3';

export default function (domain: string, { parent = null, prefix = true } = {}): string {
  parent = parent || '0000000000000000000000000000000000000000000000000000000000000000';
  const assembledHash = [parent].concat(domain
    .split('.')
    .reverse()
    .filter(label => label))
    .reduce((parent, label) => childhash(parent, label));
  return prefix ? '0x' + assembledHash : assembledHash;
}

export function childhash(parent, child) {
  const childHash = sha3(child);
  const mynode = sha3(Buffer.from(parent + childHash, 'hex'));
  return mynode;
}