const e = require('express')
const { w3cwebsocket } = require('websocket')
const { providers } = require('eth-connect')
const cors = require('cors')

const { parse, getBoundary } = require('./multipart')
const { headerValidator } = require('../../src/middlewares')
const port = process.env.PORT_TO_USE

const app = e()

app.use(cors())

const provider = new providers.WebSocketProvider('ws://127.0.0.1:8546', {
  WebSocketConstructor: w3cwebsocket
})

app.use(headerValidator(provider))

app.use(function(error, _, res, next) {
  if (error) {
    return res.status(401).send({ message: error.message })
  }
  next()
})

app.post('/', async (_, res) => {
  res.status(200).send({ valid: true })
})

app.post('/multipart', async (req, res) => {
  if (req.headers['content-type'].indexOf('multipart/form-data') !== -1) {
    let file = ''

    const boundary = getBoundary(req.headers['content-type'])
    const parts = parse(req.rawBody, boundary)
    if (parts[2].filename === 'axios.txt') {
      for (let i = 0; i <= 1000; i++) {
        file +=
          'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n'
      }
    } else if (parts[2].filename === 'fetch.txt') {
      for (let i = 0; i <= 20000; i++) {
        file +=
          'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n'
      }
    }

    const isMultipartExpected =
      parts[0].name === 'name' &&
      parts[0].data.toString() === 'Decentraland' &&
      parts[1].name === 'domain' &&
      parts[1].data.toString() === 'org' &&
      (parts[2].filename === 'axios.txt' ||
        parts[2].filename === 'fetch.txt') &&
      parts[2].data.toString() === file

    if (isMultipartExpected) {
      return res.status(200).send({ valid: true })
    } else {
      return res.status(401).send('invalid data')
    }
  }
  return res.status(401).send('invalid header')
})

app.get('/', async (_, res) => {
  res.status(200).send({ valid: true })
})

if (port) {
  module.exports = app.listen(port, () =>
    console.log(`listening to port ${port}`)
  )
} else {
  module.exports = app
}
