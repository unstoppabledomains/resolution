const { Namicorn } = require('../build')
import 'isomorphic-fetch'

const namicorn = new Namicorn({
  debug: true,
  disableMatcher: true,
})

// namicorn.use(namicorn.middleware.ens())
namicorn.use(namicorn.middleware.zns())

namicorn.resolve('super-han.zil', { filter: { strictLdhFilter: false } })
