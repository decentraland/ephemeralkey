import * as crypto from 'crypto'
import * as secp256k1 from 'secp256k1'
import { RequestManager, utils } from 'eth-connect'

import { getNetworkById } from '../helpers/networkHelper'
import {
  Message,
  Keys,
  RequestData,
  Identity,
  UserData,
  Headers,
  HeaderValidatorResponse
} from './types'

export const DURATION_IN_MONTH = 1 // 1 month
const ONE_MINUTE = 1000 * 60
export const MAX_CONTENT_SIZE = 10485760 // 10mb

export async function generateEphemeralKeys(
  provider: any,
  tokenAddress: string
): Promise<UserData> {
  const requestManager = new RequestManager(provider)
  const networkId = await requestManager.net_version()
  const accounts = await requestManager.eth_accounts()

  // Generate ephemeral keys
  const keys = generateKeyPair()

  const now = new Date()
  const expiresAt = getExpireDate()

  // Get message
  const message = await utils.toHex(
    getMessage({
      ephemeralPublicKey: keys.ephemeralPublicKey,
      network: getNetworkById(networkId),
      tokenAddress,
      now,
      expiresAt
    })
  )

  // Sign message
  const signature = await requestManager.personal_sign(message, accounts[0], '')

  return {
    address: accounts[0],
    expiresAt: expiresAt.getTime(),
    signature,
    message,
    ...keys
  }
}

export function getHeaders(userData: UserData, request: RequestData): Headers {
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

  const xIdentity = getIdentity(address, ephemeralPublicKey)

  return {
    'x-identity': xIdentity,
    'x-signature': signed.signature.toString('hex'),
    'x-certificate': message,
    'x-certificate-signature': signature,
    'x-timestamp': (request.timestamp as number).toString()
  }
}

export async function validateHeaders(
  provider: any,
  request: RequestData,
  headers: Headers
): Promise<HeaderValidatorResponse> {
  try {
    const { publicKey, ephemeralPublicKey } = decodeIdentity(
      headers['x-identity']
    )
    const timestamp = parseInt(headers['x-timestamp'], 10)

    validateContentLength(headers['content-length'])
    validateTimestamp(timestamp)
    validateSignature(
      { ...request, timestamp },
      headers['x-signature'],
      ephemeralPublicKey
    )
    validateExpiration(headers['x-certificate'])
    await validateCertificate(
      provider,
      publicKey,
      headers['x-certificate'],
      headers['x-certificate-signature']
    )
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

function getMessage(params: Message) {
  const { ephemeralPublicKey, network, tokenAddress, now, expiresAt } = params
  return `Decentraland Access Auth
Key: ${ephemeralPublicKey}.
Token: ${network}://${tokenAddress}
Date: ${now.toISOString()}
Expires: ${expiresAt.toISOString()}`
}

function getExpireDate(): Date {
  const now = new Date()
  now.setMonth(now.getMonth() + DURATION_IN_MONTH)
  return now
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

function validateTimestamp(timestamp: number): void {
  const elapsedTime = Date.now() - timestamp
  if (elapsedTime > ONE_MINUTE) {
    // valid for one minute
    throw new Error('Invalid timestamp')
  }
}

function validateSignature(
  request: RequestData,
  signature: string,
  ephemeralPublicKey: string
): void {
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
): Promise<void> {
  const requestManager = new RequestManager(provider)
  const recoveredAddress = await requestManager.personal_ecRecover(
    certificate,
    signature
  )

  if (publicKey !== recoveredAddress) throw new Error('Invalid certificate')
}

function validateExpiration(certificate: string) {
  try {
    const expiresAt = utils.toAscii(certificate).split('Expires: ')[1]
    const date = new Date(expiresAt)

    if (date.getTime() - Date.now() < 0) throw new Error()
  } catch (_) {
    throw new Error('Expired keys. Please generate a new pair')
  }
}

export function getMethodMessage(param: RequestData): Buffer {
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
