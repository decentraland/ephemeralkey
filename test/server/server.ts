const e = require('express')
const { w3cwebsocket } = require('websocket')
const { providers } = require('eth-connect')

const { ephemeralkey } = require('../../dist/ephemeralkey')
const { headerValidator } = require('../../dist/middlewares')

const app = e()

const provider = new providers.WebSocketProvider('ws://127.0.0.1:8546', {
  WebSocketConstructor: w3cwebsocket
})

app.use(headerValidator(provider))

app.use(function(error, _, res, next) {
  if (error) {
    res.status(401).send({ message: error.message })
  }
  next()
})

app.post('/', async (_, res) => {
  res.status(200).send()
})

app.get('/', async (_, res) => {
  res.status(200).send()
})

module.exports = app
