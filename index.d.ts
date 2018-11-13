export = Namicorn
export as namespace Namicorn

declare interface Names {
  isLdh(value: string): boolean
  isZil(value: string): boolean
  isEth(value: string): boolean
  isTopLevel(value: string): boolean
  normalize(value: string): string
  mangle(value: string): string
}

declare namespace Namicorn {
  export { name }

  const name: Names
}
