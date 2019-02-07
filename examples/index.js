import Namicorn from '../src'

const namicorn = new Namicorn({
  // debug: true,
  disableMatcher: true,
})

namicorn.use(namicorn.middleware.ens())
namicorn.use(namicorn.middleware.zns())

namicorn.resolve('supername.zil', { filter: { strictLdhFilter: false } })
