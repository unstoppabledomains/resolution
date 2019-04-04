class Middleware {
  stack = []

  use = (...fns) => {
    this.stack.push.apply(this.stack, fns)
    return this
  }

  invoke = (context = {}) => {
    const middleware = this.stack.values()
    const next = async () => {
      const iter = middleware.next()
      if (!iter.done) return iter.value(context, next)
    }

    return next()
  }
}

export { Middleware, Middleware as default }
