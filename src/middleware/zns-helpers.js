import { sha256 as sha } from 'hash.js'

export const sha256 = (
  message,
  { hexPrefix = true, inputEnc, outputEnc = 'hex' } = {},
) =>
  (hexPrefix ? '0x' : '') +
  sha()
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

let id = 0

export function zilliqaRpcCall(url, method, ...params) {
  return wrapZilliqaRpcCall(
    fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        id: String(++id),
        jsonrpc: '2.0',
        method,
        params,
      }),
    }).then(resp =>
      resp.ok ? resp.json() : Promise.reject('failed to fetch'),
    ),
  )
}
