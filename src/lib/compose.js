function compose(...fns) {
  if (fns.length === 0) return arg => arg
  else if (fns.length === 1) return fns[0]
  else return fns.reduce((a, b) => (...args) => a(b(...args)))
}

export { compose, compose as default }
