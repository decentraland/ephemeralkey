export type Message = {
  ephemeralPublicKey: string
  network: string
  tokenAddress: string
  nftId: string
}

export type Keys = {
  ephemeralPrivateKey: string
  ephemeralPublicKey: string
}

export type Headers = {
  'X-Identity': string
  'X-Signature': string
  'X-Certificate': string
  'X-Certificate-Signature': string
  'X-Timestamp': string
}

export type ServerHeaders = Headers & {
  'Content-Length': string
}

export type UserData = Keys & {
  address: string
  message: string
  signature: string
}

export type HTTPRequest = {
  method: 'GET' | 'POST'
  url: string
  body: Buffer
  timestamp?: number
}

export type Identity = {
  publicKey: string
  ephemeralPublicKey: string
}
