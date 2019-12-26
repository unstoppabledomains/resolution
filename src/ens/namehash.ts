var sha3 = require('js-sha3').keccak_256
var uts46 = require('idna-uts46-hx')

export type nodeHash = string;

export default function (domain: string, { parent = null, prefix = true } = {}): nodeHash {
  parent = parent || '0000000000000000000000000000000000000000000000000000000000000000';
  domain = normalize(domain);
  const assembledHash = [parent].concat(
    domain.split('.')
      .reverse()
      .filter(label => label)
  )
    .reduce((parent, label) => childhash(parent, label))
  return prefix ? '0x' + assembledHash : assembledHash;
}

export function childhash(parent: nodeHash, label: string): nodeHash {
  const childHash = sha3(label);
  return sha3(Buffer.from(parent + childHash, 'hex'));
}

export function normalize(name: string): string {
  return name ? uts46.toUnicode(name, { useStd3ASCII: true, transitional: false }) : name
}