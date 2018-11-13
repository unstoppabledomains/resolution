import punycode from 'punycode'

export { isLdh, isZil, isEth, isTopLevel, normalize, mangle }

function isLdh(value) {
  return /^(?:[a-z0-9-]+\.)*[a-z0-9-]+\.?$/.test(value)
}

function isZil(value) {
  return /^(?:[a-z0-9-]+\.)+zil\.?$/.test(value)
}

function isEth(value) {
  return /^(?:[a-z0-9-]+\.)+eth\.?$/.test(value)
}

function isTopLevel(value) {
  return /^[a-z0-9-]+\.{eth,zil}\.?$/.test(value)
}

function normalize(value) {
  try {
    const encoded = punycode.toASCII(value).toLowerCase()

    if (isLdh(encoded)) return encoded
  } catch (error) {
    throw new Error("value isn't punycode compliant")
  }
  throw new Error("value isn't idna compliant")
}

function mangle() {}
