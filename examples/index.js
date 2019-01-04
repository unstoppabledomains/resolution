import Namicorn from '../src'

const namicorn = new Namicorn()

namicorn.use(namicorn.middleware.debugger)

namicorn
  .resolve('hello', { filter: { strictLdhFilter: false } })
  .then(console.log.bind(console, 'result'))
  .catch(console.error.bind(console, 'error'))

// export { name, createNamicorn }

/*
 */
