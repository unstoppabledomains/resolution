class ZNS {
  cache = new Map()

  constructor({ ttl = 0, url = 'https://api-scilla.zilliqa.com' } = {}) {
    this.ttl = ttl
    this.url = url
  }

  static match = () => true
  match = this.constructor.match

  resolve = async (name, { ttl }) => {
    const cached = this.cache.get(name)

    if (cached.isValid === true) return cached.value
    else {
      const result = await Promise.resolve('lookup')

      this.cache.set(name, result, ttl || this.ttl)
    }
  }
}
