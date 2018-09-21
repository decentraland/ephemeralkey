import * as crypto from 'crypto'
import * as secp256k1 from 'secp256k1'
import { RequestManager, utils } from 'eth-connect'

import { getNetworkById } from '../helpers/networkHelper'
import {
  Message,
  Keys,
  HTTPRequest,
  Identity,
  UserData,
  Headers,
  ServerHeaders
} from './types'

const ONE_MINUTE = 1000 * 60
export const MAX_CONTENT_SIZE = 1024 * 64 // 64kb

export async function generateEphemeralKeys(
  provider: any, // @nacho TODO: should type a provider
  tokenAddress: string,
  nftId: string
): Promise<UserData> {
  const requestManager = new RequestManager(provider)
  const networkId = await requestManager.net_version()
  const accounts = await requestManager.eth_accounts()

  // Generate ephemeral keys
  const keys = generateKeyPair()
  // Get message
  const message = await utils.toHex(
    getMessage({
      ephemeralPublicKey: keys.ephemeralPublicKey,
      network: getNetworkById(networkId),
      tokenAddress,
      nftId
    })
  )

  // Sign message
  const signature = await requestManager.personal_sign(message, accounts[0], '')

  return { address: accounts[0], signature, message, ...keys }
}

export async function getHeaders(
  userData: UserData,
  request: HTTPRequest
): Promise<Headers> {
  const {
    address,
    ephemeralPrivateKey,
    ephemeralPublicKey,
    message,
    signature
  } = userData

  const methodMessage = getMethodMessage(request)
  const signed = secp256k1.sign(
    methodMessage,
    Buffer.from(ephemeralPrivateKey, 'hex')
  )

  const xIdentity = await getIdentity(address, ephemeralPublicKey)

  return {
    'X-Identity': xIdentity,
    'X-Signature': signed.signature.toString('hex'),
    'X-Certificate': message,
    'X-Certificate-Signature': signature,
    'X-Timestamp': (request.timestamp as number).toString()
  }
}

export async function validateHeaders(
  provider: any, // @nacho TODO: should type a provider
  request: HTTPRequest,
  headers: ServerHeaders
): Promise<boolean | Error> {
  const { publicKey, ephemeralPublicKey } = decodeIdentity(
    headers['X-Identity']
  )
  const timestamp = parseInt(headers['X-Timestamp'], 10)

  validateContentLength(headers['Content-Length'])
  validateTimestamp(timestamp)
  validateSignature(
    { ...request, timestamp },
    headers['X-Signature'],
    ephemeralPublicKey
  )
  await validateCertificate(
    provider,
    publicKey,
    headers['X-Certificate'],
    headers['X-Certificate-Signature']
  )

  return true
}

function getMessage(params: Message) {
  const { ephemeralPublicKey, network, tokenAddress, nftId } = params
  return `Decentraland Access Auth
Key: ${ephemeralPublicKey}.
Token: ${network}://${tokenAddress}/${nftId}
Date: ${new Date().toString()}
Expires: ${new Date().toString()} ` // TODO: update Expire
}

function getIdentity(address: string, ephemeralPublicKey: string): string {
  return `decentraland:${address}/temp/${ephemeralPublicKey}`
}

function digest(message: Buffer) {
  return crypto
    .createHash('sha256')
    .update(message)
    .digest()
}

function generateKeyPair(): Keys {
  let privateKey: any
  let retries = 0
  // Generate a private key until valid
  do {
    privateKey = crypto.randomBytes(32)
    retries++
  } while (!secp256k1.privateKeyVerify(privateKey) || retries < 10)
  return {
    ephemeralPublicKey: secp256k1.publicKeyCreate(privateKey).toString('hex'),
    ephemeralPrivateKey: privateKey.toString('hex')
  }
}

function validateContentLength(contentSize: string) {
  if (parseInt(contentSize, 10) > MAX_CONTENT_SIZE) {
    throw new Error(
      `Content size exceeded. Max length is ${MAX_CONTENT_SIZE} bytes`
    )
  }
}

function validateTimestamp(timestamp: number): void | Error {
  const elapsedTime = Date.now() - timestamp
  if (elapsedTime > ONE_MINUTE) {
    // valid for one minute
    throw new Error('Invalid timestamp')
  }
}

function validateSignature(
  request: HTTPRequest,
  signature: string,
  ephemeralPublicKey: string
): void | Error {
  const methodMessage = getMethodMessage(request)
  if (
    !secp256k1.verify(
      methodMessage,
      Buffer.from(signature, 'hex'),
      Buffer.from(ephemeralPublicKey, 'hex')
    )
  ) {
    throw new Error('Invalid signature')
  }
}

async function validateCertificate(
  provider: any,
  publicKey: string,
  certificate: string,
  signature: string
): Promise<void | Error> {
  const requestManager = new RequestManager(provider)
  const recoveredAddress = await requestManager.personal_ecRecover(
    certificate,
    signature
  )
  if (publicKey !== recoveredAddress) throw new Error('Invalid certificate')
}

export function getMethodMessage(param: HTTPRequest): Buffer {
  const { method, url, timestamp, body } = param
  const message = Buffer.concat([
    Buffer.from(method),
    Buffer.from(url),
    Buffer.from((timestamp as number).toString()),
    body
  ])
  return digest(message)
}

export function decodeIdentity(identity: string): Identity {
  const values = identity.split(':')[1].split('/')
  return { publicKey: values[0], ephemeralPublicKey: values[2] }
}
