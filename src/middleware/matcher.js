function matcherMiddleware(
  {
    name,
    filter: { mangle = false, normalize = true, strictLdhFilter = true },
  },
  next,
) {
  const labelRegex = strictLdhFilter
    ? '(?:[a-zA-Z][a-zA-Z0-9]*(?:-*[a-zA-Z0-9]+)*)'
    : '(?:[^.]+)'
  const regex = new RegExp(`/^(?:${labelRegex}\.)+${labelRegex}$/`)

  if (regex.test(name)) return next()
  throw new Error('Invalid domain name')
}

export { matcherMiddleware, matcherMiddleware as default }
