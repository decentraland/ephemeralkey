# Decentraland - Ephemeralkey

Lib usage for creating an ephemeral key to be used by Decentraland's apps

# Table of content

- [Exposed API](#api)
  - [generateEphemeralKeys](#generate)
  - [getHeaders](#headers)
  - [validateHeaders](#validate)
  - [decodeIdentity](#decodeIdentity)
- [Utils](#utils)
  - [Middlewares](#middlewares)
    - [headerValidator](#headerValidator)
  - [Wrappers](#wrappers)
    - [Axios](#axios)
    - [Fetch](#fetch)
  - [Helpers](#helpers)
    - [CreateFormData](#createformdata)
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
  tokenAddress: string
): Promise<UserData>
```

#### Usage

```ts
import { generateEphemeralKeys } from 'ephemeralkey'

const decentralandInviteAddress = '0x12345'

const userData = generateEphemeralKeys(
  web3.currentProvider,
  decentralandInviteAddress
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
  expiresAt: Date
}
```

## Headers

- Return the headers you should send in the request

### getHeaders

#### Definition:

```ts
function getHeaders(userData: UserData, request: RequestData): Headers
```

#### Usage

```ts
import { getHeaders } from 'ephemeralkey'

async function fetchWithEphemeralKey(request: RequestData): Promise<any> {
  const userData = JSON.parse(
    localstorage.getItem('ephemeral-data', JSON.stringify(userData))
  )
  const headers = getHeaders(userData, request)

  return fetch(request.url, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    },
    body: request.body.toString()
  })
}

const response = await fetchWithEphemeralKey({
  url: 'market.decentraland.org/api/v1/land',
  method: 'POST',
  timestamp: Date.now(),
  body: Buffer.from(JSON.stringify({ param1: 'param1', param2: 'param2' }))
})
```

#### Response

```ts
{
  'x-identity': string
  'x-signature': string
  'x-certificate': string
  'x-certificate-signature': string
  'x-timestamp': string
}
```

## Validate

### validateHeaders

- Validate headers received on the request
- Should return error if :

  - The Method of the request does not match the signed request
  - The URL doesn’t match the expected URL of the server
  - The timestamp is off by more than 1 minute relative to the system clock
  - The signature doesn’t match the Ephemeral Address
  - The content-length is more than 65,536 bytes (64kb) (This is to avoid DDoS by sending a body that is too large)
  - The Certificate Signature does not correspond to the web3 address in the x-identity header

- Returns `{ success: true }` if everything is ok

#### Definition:

```ts
async function validateHeaders(
  provider: any,
  request: RequestData,
  headers: Headers
): Promise<HeaderValidatorResponse>
```

#### Usage

```ts
import { validateHeaders } from 'ephemeralkey'

app.post('/land', function(req, res) {
  const response = await validateHeaders(
    {
      method: req.method,
      url: req.protocol + '://' + req.get('host') + req.originalUrl,
      body: Buffer.from(req.body) // req.body is illustrative, get it from request
    },
    req.headers
  )
  if (response.error) {
    res.status(401).send(error)
  }
  res.status(200)send({ message: 'everything ok' })
})
```

#### Response

```ts
{
  success: true
}
```

or

```ts
{ success: false, error:  Error('Invalid signature') }
{ success: false, error:  Error('Invalid certificate') }
{ success: false, error:  Error('Content size exceeded. Max length is 10 mb') }
{ success: false, error:  Error('Invalid timestamp') }
```

### decodeIdentity

Returns the address and the ephemeral public key of the user who sent the request

##### Definition

```ts
function decodeIdentity(identity: string): Identity
```

##### Usage

```ts
import { decodeIdentity } from 'ephemeralkey'

const identity: Identity = decodeIdentity(headers['x-identity'])
```

#### Response

```ts
{
  publicKey: string
  ephemeralPublicKey: string
}
```

# Utils

## Middlewares

Set of middlewares

### headerValidator

Middleware to validate a sign request using [validateHeaders](#validateHeaders)

#### Usage

```ts
const e = require('express')
const { w3cwebsocket } = require('websocket')
const { providers } = require('eth-connect')

const { headerValidator } = require('ephemeralkey')

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

Wrappers to send signed request

### Axios

Attach a request interceptor to an axios instance to send signed requests

#### Usage

```ts
import axios from 'axios'

import { generateEphemeralKeys, wrapAxios } from 'ephemeralkey'

const axiosInstance = axios.create()
const userData = await generateEphemeralKeys(provider, 'tokenAddress')

wrapAxios(userData)(axiosInstance)

const res = await axiosInstance('http://localhost:3001/', {
  method: 'POST',
  data: JSON.stringify({ param1: 'data1', param2: 'data2' })
})
```

### Fetch

Wrap a fetch instance to send a signed requests

#### Usage

```ts
import { ephemeralkey, wrapFetch } from 'ephemeralkey'

const userData = await ephemeralkey.generateEphemeralKeys(
  provider,
  'tokenAddress'
)

const wrappedFetch = wrapFetch(userData)(window.fetch)

const res = await wrappedFetch('http://localhost:3001/', {
  method: 'GET'
})
```

## Helpers

### createformdata

Ceate an isomorphic FormData to send mutipart-data requests

#### Usage

##### Client-Side

```ts
import { createFormData } from 'ephemeralkey'

formData = createFormData({
  name: ['Decentraland'],
  domain: ['org'],
  the_file: [buf, 'axios.txt']
})

const res = await wrappedFetch('https://decentraland.org/api', {
  method: 'POST',
  body: formData
})
```

##### Server-Side

```ts
import { createFormData } from 'ephemeralkey'

const formdata = createFormData({
  name: 'Decentraland',
  domain: 'org',
  the_file: fs.createReadStream('fetch.txt')
})

const res = await wrappedFetch('https://decentraland.org/api/multipart', {
  method: 'POST',
  body: formdata
})
```

##### Caveat

It doesn't support Blob, you should transform it to Buffer

```ts
async function toBuffer(blob) {
  const reader = new window.FileReader()
  return new Promise(r => {
    function onLoadEnd(e) {
      reader.removeEventListener('loadend', onLoadEnd, false)
      if (e.error) r(e.error)
      else r(Buffer.from(reader.result))
    }
    reader.addEventListener('loadend', onLoadEnd, false)
    reader.readAsArrayBuffer(blob)
  })
}

const buf = await toBuffer(blob)
```

# Tests

On one terminal run:

`./scripts/start-local-node.sh` It starts a geth node using Docker

## Node Tests

On a second terminal run:

`npm run test`

## Browser Tests

On a second terminal run:

`npm run test:browser`

## Node & Browser Tests

On a second terminal run:

`npm run test:all`
