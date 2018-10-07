export type Message = {
  ephemeralPublicKey: string
  network: string
  tokenAddress: string
  now: Date
  expiresAt: Date
}

export type Keys = {
  ephemeralPrivateKey: string
  ephemeralPublicKey: string
}

export type Headers = {
  'x-identity': string
  'x-signature': string
  'x-certificate': string
  'x-certificate-signature': string
  'x-timestamp': string
  [key: string]: string
}

export type UserData = Keys & {
  address: string
  message: string
  signature: string
  expiresAt: Date
}

export type Request = {
  method: string
  url: string
  body: Buffer
  timestamp?: number
}

export type Identity = {
  publicKey: string
  ephemeralPublicKey: string
}

export type HeaderValidatorResponse = {
  success: boolean
  error?: Error
}
