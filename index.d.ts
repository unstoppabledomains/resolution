declare interface Names {
  isLdh(value: string): boolean
  isZil(value: string): boolean
  isEth(value: string): boolean
  isTopLevel(value: string): boolean
  normalize(value: string): string
  isNormalized(value: string): boolean
  // mangle(value: string): string
}

type NamicornMiddleware = (context: any, next: (error?: Error) => void) => any

class Namicorn {
  static create(): Namicorn

  debug: boolean
  middleware: {
    debugger: NamicornMiddleware
    ens: (options?: { url?: string }) => NamicornMiddleware
    zns: (options?: { url?: string }) => NamicornMiddleware
    matcher: NamicornMiddleware
  }
  use(...middlewares: NamicornMiddleware[]): void

  constructor(options: { debug: boolean; disableMatcher: boolean })

  resolve(name: string, options?: any): any
}

export { Namicorn, Namicorn as default }
