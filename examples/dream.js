import Namicorn from 'namicorn'
import Znsicorn from '@namicorn/zns'
import Ensicorn from '@namicorn/ens'

const namicorn = new Namicorn()

namicorn.register(new Znsicorn({}))
namicorn.register(new Ensicorn())

namicorn.resolve('nameyname')
// [Promise rejected](RangeError)

namicorn.resolve('nameyname.zil')
// [Promise resolved]([Object])

namicorn.resolve('nameyname.zil', {
  match: {
    onlyTld: true,
    disablePunycodeParser: true,
  },
  ttl: 3000,
  resolve: {
    onlyAddress: true,
  },
})
// [Promise resolved]([Object])
