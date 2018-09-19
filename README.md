# Decentraland - Ephemeralkey

Lib usage for creating an ephemeral key usage by Decentraland's apps

# Exposed API

- [generateEphemeralKeys](#generate)
- [getHeaders](#headers)
- [validateHeaders](#validate)

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
async function getHeaders(
  userData: UserData,
  request: HTTPRequest
): Promise<Headers>
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
  'X-Identity': string
  'X-Signature': string
  'X-Certificate': string
  'X-Certificate-Signature': string
  'X-Timestamp': number
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
* - The Certificate Signature does not correspond to the web3 address in the X-Identity header

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
```

# Tests

On one terminal run:

`./start-local-node.sh` It starts a geth node using Docker

On a second terminal run:

`npm run test`
