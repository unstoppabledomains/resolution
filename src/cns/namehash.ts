import { keccak_256 as sha3 } from 'js-sha3';
import { nodeHash } from '../types';

export default function(
  domain: string,
  { parent, prefix }: { parent?: string; prefix?: boolean } = { prefix: true },
): string {
  parent =
    parent ||
    '0000000000000000000000000000000000000000000000000000000000000000';
  const assembledHash = [parent]
    .concat(
      domain
        .split('.')
        .reverse()
        .filter(label => label),
    )
    .reduce((parent, label) => childhash(parent, label, { prefix: false }));
  return prefix ? '0x' + assembledHash : assembledHash;
}

export function childhash(
  parent: nodeHash,
  label: string,
  options: { prefix: boolean } = { prefix: true },
) {
  parent = parent.replace(/^0x/, '');
  const childHash = sha3(label);
  const mynode = sha3(Buffer.from(parent + childHash, 'hex'));
  return (options.prefix ? '0x' : '') + mynode;
}
