# Decentraland - Ephemeralkey

Lib usage for creating an ephemeral key to be used by Decentraland's apps

# Table of content

- [Exposed API](#api)
  - [generateEphemeralKeys](#generate)
  - [getHeaders](#headers)
  - [validateHeaders](#validate)
- [Utils](#utils)
  - [Middlewares](#middlewares)
  - [Wrappers](#wrappers)
    - [Axios](#axios)
    - [Fetch](#fetch)
- [Tests](#tests)

# API

## Generate

### generateEphemeralKeys

- Generate a pair of keys (ephemeral public and private keys)
- Ask to sign a message with your metamask/HW address in order to create a reliable certificate
- returns `UserData`

#### Definition:

```ts
async function generateEphemeralKeys(
  provider: any,
  tokenAddress: string,
  nftId: string
): Promise<UserData>
```

#### Usage

```ts
import { ephemeralkey } from 'ephemeralkey'

const decentralandInviteAddress = '0x12345'
const inviteTokenId = '1'

const userData = ephemeralkey.generateEphemeralKeys(
  web3.currentProvider,
  decentralandInviteAddress,
  inviteTokenId
)

localstorage.setItem('ephemeral-data', JSON.stringify(userData))
```

#### Response

```ts
{
  ephemeralPrivateKey: string
  ephemeralPublicKey: string
  address: string
  message: string
  signature: string
}
```

## Headers

- Return the headers to be validated in the server

### getHeaders

#### Definition:

```ts
function getHeaders(userData: UserData, request: HTTPRequest): Headers
```

#### Usage

```ts
import { ephemeralkey } from 'ephemeralkey'

async function fetchWithEphemeralKey(request: HTTPRequest): Promise<any> {
  const userData = JSON.parse(
    localstorage.getItem('ephemeral-data', JSON.stringify(userData))
  )
  const headers = ephemeralkey.getHeaders(userData, request)

  return fetch(request.url, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    },
    body: request.body
  })
}

const response = await fetchWithEphemeralKey({
  url: 'market.decentraland.org/api/v1/land',
  method: 'POST',
  timestamp: Date.now(),
  body: JSON.stringify({ param1: 'param1', param2: 'param2' })
})
```

#### Response

```ts
{
  'x-identity': string
  'x-signature': string
  'x-certificate': string
  'x-certificate-signature': string
  'x-timestamp': number
}
```

## Validate

### validateHeaders

- Validate headers received on the request
- Should throw if:

* - The Method of the request does not match the signed request
* - The URL doesn’t match the expected URL of the server
* - The timestamp is off by more than 1 minute relative to the system clock
* - The signature doesn’t match the Ephemeral Address
* - The content-length is more than 65,536 bytes (64kb) (This is to avoid DDoS by sending a body that is too large)
* - The Certificate Signature does not correspond to the web3 address in the x-identity header

- Returns true if everything is ok

#### Definition:

```ts
async function validateHeaders(
  provider: any,
  request: HTTPRequest,
  headers: ServerHeaders
): Promise<boolean | Error>
```

#### Usage

```ts
import { ephemeralkey } from 'ephemeralkey'

app.post('/land', function(req, res) {
  ephemeralkey.validateHeaders(
    {
      method: 'POST', // get it from req object
      url: 'market.decentraland.org/api/v1/land', // get it from req object
      body: JSON.stringify({ param1: 'param1', param2: 'param2' }) // get it from req object
    },
    req.headers
  )
  res.send('everything ok')
})
```

#### Response

```ts
true
```

or

```ts
Error('Invalid signature')
Error('Invalid certificate')
Error('Invalid timestamp')
Error('Content size exceeded. Max length is 64000 bytes')
```

# Utils

## Middlewares

Set of middlewares

### Nodejs

The `headerValidator` middleware validates the request based using method `validateHeaders` from the API

#### Usage

```ts
const e = require('express')
const { w3cwebsocket } = require('websocket')
const { providers } = require('eth-connect')

const { ephemeralkey } = require('ephemeralkey')
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

app.listen(3000, () => console.log('ready....'))
```

## Wrappers

### Axios

#### Usage

```ts
import axios from 'axios'

import { ephemeralkey } from 'ephemeralkey'
import { wrapAxios } from '../../dist/wrappers'

const axiosInstance = axios.create()
const userData = await ephemeralkey.generateEphemeralKeys(
  provider,
  'tokenAddress',
  'tokenId'
)

wrapAxios(userData)(axiosInstance)

const res = await axiosInstance('http://localhost:3001/', {
  method: 'GET',
  data: ''
})
```

### Fetch

#### Usage

```ts
import { ephemeralkey } from 'ephemeralkey'
import { wrapFetch } from '../../dist/wrappers'

const userData = await ephemeralkey.generateEphemeralKeys(
  provider,
  'tokenAddress',
  'tokenId'
)

const wrappedFetch = wrapFetch(userData)(window.fetch)

const res = await wrappedFetch('http://localhost:3001/', {
  method: 'GET'
})
```

# Tests

On one terminal run:

`./start-local-node.sh` It starts a geth node using Docker

## Node Tests

On a second terminal run:

`npm run test`

## Browser Tests

On a second terminal run:

`npm run test:browser`

If you want to test end2end with a server running in another tab, uncomment

`// app.listen(3001, () => console.log('ready..')) // uncomment if you want to test with the server in other tab`

at `test/helpers/server.ts` and run `./node_modules/.bin/ts-node test/server/server.ts`
