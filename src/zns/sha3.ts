import hash from 'hash.js'

export default (
  message,
  {
    hexPrefix = true,
    inputEnc = null,
    outputEnc = 'hex',
  }: {hexPrefix?: boolean; inputEnc?: 'hex'; outputEnc?: 'hex'} = {},
) =>
  (hexPrefix ? '0x' : '') +
  hash.sha256()
    .update(message, inputEnc)
    .digest(outputEnc)
