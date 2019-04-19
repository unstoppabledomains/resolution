import Middleware from './Middlware'

class Core {
  static create = options => new Core(options)

  debug: boolean
  private manager = new Middleware()
  use = this.manager.use

  constructor({ debug = false }: { debug?: boolean } = {}) {
    this.debug = debug
  }

  resolve = (name, opts = {}) =>
    this.manager.invoke({ ...opts, self: this, name })
}

export { Core, Core as default }
