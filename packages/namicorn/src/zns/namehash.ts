import sha3 from './sha3'

export default (name = '') =>
  '0x' +
  ['0000000000000000000000000000000000000000000000000000000000000000']
    .concat(
      name
        .split('.')
        .reverse()
        .filter(label => label)
        .map(label => sha3(label, {hexPrefix: false})),
    )
    .reduce((a, labelHash) =>
      sha3(a + labelHash, {hexPrefix: false, inputEnc: 'hex'}),
    )
