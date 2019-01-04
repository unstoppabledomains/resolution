import { Middleware } from './lib'
import {
  createEnsMiddleware,
  createZnsMiddleware,
  matcherMiddleware,
} from './middleware'

class Namicorn {
  static create = () => new Namicorn()

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

  resolve = (name, opts) => this.manager.invoke({ ...opts, self: this, name })
}

export { Namicorn, Namicorn as default }
