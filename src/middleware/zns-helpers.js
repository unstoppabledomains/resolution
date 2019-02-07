import * as hash from 'hash.js'

export const sha256 = (
  message,
  { hexPrefix = true, inputEnc, outputEnc = 'hex' } = {},
) =>
  (hexPrefix ? '0x' : '') +
  hash
    .sha256()
    .update(message, inputEnc)
    .digest(outputEnc)

export const nameHash = (name = '') =>
  '0x' +
  ['0000000000000000000000000000000000000000000000000000000000000000']
    .concat(
      name
        .split('.')
        .reverse()
        .filter(label => label)
        .map(label => sha256(label, { hexPrefix: false })),
    )
    .reduce((a, labelHash) =>
      sha256(a + labelHash, { hexPrefix: false, inputEnc: 'hex' }),
    )

export function wrapZilliqaRpcCall(promise) {
  return promise.then(response => {
    if (response.Error) throw new Error(response.Error)
    else if (response.error) throw new Error(response.error.message)
    else return response.result
  })
}
