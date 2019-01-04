class Cache {
  store = new Map()
  // cap = Infinity
  ttl = 0

  withTtl = newTtl => {
    this.ttl = newTtl
    return this
  }

  put = (key, value, ttl = this.ttl) => {
    if (ttl < 1) this.delete(key)
    else {
      if (this.store.has(key)) clearTimeout(this.store.get(key).timeout)
      this.store.set(key, {
        value,
        timeout: setTimeout(() => this.store.delete(key), ttl),
      })
    }
  }

  get = key => {
    if (this.store.has(key)) return this.store.get(key).value
  }

  delete = key => {
    if (this.store.has(key)) {
      clearTimeout(this.store.get(key).timeout)
      this.store.delete(key)
    }
  }
}

export { Cache, Cache as default }
