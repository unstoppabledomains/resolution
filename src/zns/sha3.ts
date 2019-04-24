import {sha256 as sha} from 'hash.js'

export default (
  message,
  {
    hexPrefix = true,
    inputEnc = null,
    outputEnc = 'hex',
  }: {hexPrefix?: boolean; inputEnc?: 'hex'; outputEnc?: 'hex'} = {},
) =>
  (hexPrefix ? '0x' : '') +
  sha()
    .update(message, inputEnc)
    .digest(outputEnc)
