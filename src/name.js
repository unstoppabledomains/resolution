import punycode from 'punycode'

export function isLdh(value) {
  return /^(?:[a-z0-9-]+\.)*[a-z0-9-]+\.?$/.test(value)
}

export function isZil(value) {
  return /^(?:[a-z0-9-]+\.)+zil\.?$/.test(value)
}

export function isEth(value) {
  return /^(?:[a-z0-9-]+\.)+eth\.?$/.test(value)
}

export function isTopLevel(value) {
  return /^[a-z0-9-]+\.{eth,zil}\.?$/.test(value)
}

export function normalize(value) {
  try {
    const encoded = punycode.toASCII(value).toLowerCase()

    if (isLdh(encoded)) return encoded
  } catch (error) {
    throw new Error("value isn't punycode compliant")
  }
  throw new Error("value isn't idna compliant")
}

export function isNormalized(value) {
  try {
    const encoded = punycode.toASCII(value).toLowerCase()

    if (isLdh(encoded)) return encoded
    return false
  } catch (error) {
    return false
  }
}

function mangle() {}
