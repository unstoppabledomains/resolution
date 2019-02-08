import { Middleware } from './lib'
import {
  createEnsMiddleware,
  createZnsMiddleware,
  matcherMiddleware,
} from './middleware'

class Namicorn {
  static create = options => new Namicorn(options)

  debug = true
  middleware = {
    debugger: (context, next) =>
      next().then(
        result => {
          if (context.self.debug) console.log(result)
          return result
        },
        error => {
          if (context.self.debug) console.error(error)
          throw error
        },
      ),
    ens: createEnsMiddleware,
    zns: createZnsMiddleware,
    matcher: matcherMiddleware,
  }

  manager = new Middleware().use(this.middleware.debugger)
  use = this.manager.use

  constructor({ debug = false, disableMatcher = false }) {
    this.debug = debug
    if (!disableMatcher) this.use(this.middleware.matcher)
  }

  resolve = (name, opts) => this.manager.invoke({ ...opts, self: this, name })
}

export { Namicorn, Namicorn as default }
