import * as secp256k1 from 'secp256k1'
import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import { w3cwebsocket } from 'websocket'
import { RequestManager, providers, utils } from 'eth-connect'

import { wait } from './helpers/helpers'

chai.use(chaiAsPromised)
const expect = chai.expect

import {
  generateEphemeralKeys,
  getHeaders,
  decodeIdentity,
  getMethodMessage,
  validateHeaders,
  MAX_CONTENT_SIZE,
  DURATION_IN_MONTH
} from '../src/ephemeralkey/ephemeralkey'

import {
  UserData,
  RequestData,
  Headers,
  Identity
} from '../src/ephemeralkey/types'

const inviteAddress = '0x12345'
const url = 'http://market.decentraland.org/api/v1/marketplace'
const timestamp = Date.now()
const oneMinute = 1000 * 60

const request: RequestData = {
  method: 'POST',
  body: Buffer.from(
    JSON.stringify({ param1: 'data1', param2: 'data2' }),
    'utf8'
  ),
  url,
  timestamp
}

describe('EphemeralKey', function() {
  this.timeout(999999)
  const provider = new providers.WebSocketProvider('ws://127.0.0.1:8546', {
    WebSocketConstructor: w3cwebsocket
  })
  const requestManager = new RequestManager(provider)

  describe('generateEphemeralKeys', function() {
    it('should generate ephemeralKeys', async function() {
      const dateFromNow = new Date()
      dateFromNow.setMonth(dateFromNow.getMonth() + DURATION_IN_MONTH)
      const {
        address,
        signature,
        message,
        ephemeralPublicKey,
        ephemeralPrivateKey,
        expiresAt
      } = await generateEphemeralKeys(provider, inviteAddress)

      const accounts = await requestManager.eth_accounts()
      expect(signature.length).to.gt(0)
      expect(message.length).to.gt(0)
      expect(ephemeralPublicKey.length).to.gt(0)
      expect(ephemeralPrivateKey.length).to.gt(0)
      expect(address).to.equal(accounts[0])
      expect(ephemeralPublicKey).to.not.equal(ephemeralPrivateKey)
      expect(expiresAt).to.be.gt(dateFromNow.getTime())

      const recoveredPublicKey = await requestManager.personal_ecRecover(
        message,
        signature
      )

      expect(recoveredPublicKey).to.equal(accounts[0])
    })

    it('should generate different user data when generate', async function() {
      const response1: UserData = await generateEphemeralKeys(
        provider,
        inviteAddress
      )

      const response2: UserData = await generateEphemeralKeys(
        provider,
        inviteAddress
      )

      expect(response1).to.not.deep.equal(response2)
    })
  })

  describe('With generated ephemeral keys', function() {
    let userData: UserData

    it('should generate user data', async function() {
      userData = await generateEphemeralKeys(provider, inviteAddress)
    })

    describe('getHeaders', function() {
      it('should get headers', async function() {
        const headers: Headers = await getHeaders(userData, request)
        const accounts = await requestManager.eth_accounts()
        const identity: Identity = decodeIdentity(headers['x-identity'])

        expect(identity.ephemeralPublicKey).to.equal(
          userData.ephemeralPublicKey
        )
        expect(identity.publicKey).to.equal(accounts[0])
        expect(headers['x-signature'].length).to.gt(0)
        expect(
          secp256k1.verify(
            getMethodMessage(request),
            Buffer.from(headers['x-signature'], 'hex'),
            Buffer.from(userData.ephemeralPublicKey, 'hex')
          ),
          'verify signature'
        ).to.equal(true)
        expect(headers['x-certificate']).to.equal(userData.message)
        expect(headers['x-certificate-signature']).to.equal(userData.signature)
      })

      it('should get different signature for each request', async function() {
        userData = await generateEphemeralKeys(provider, inviteAddress)

        const headers: Headers = await getHeaders(userData, request)
        const anotherHeaders: Headers = await getHeaders(userData, {
          ...request,
          url: 'http://market.decentraland.org/api/v1/land'
        })
        const justAnotherHeaders: Headers = await getHeaders(userData, {
          ...request,
          body: Buffer.from('{}')
        })
        const hackedRequest: Headers = await getHeaders(userData, {
          ...request,
          timestamp: timestamp + 1
        })

        expect(headers['x-signature']).to.not.equal(
          anotherHeaders['x-signature']
        )
        expect(headers['x-signature']).to.not.equal(
          justAnotherHeaders['x-signature']
        )
        expect(headers['x-signature']).to.not.equal(
          hackedRequest['x-signature']
        )
        expect(anotherHeaders['x-signature']).to.not.equal(
          justAnotherHeaders['x-signature']
        )
        expect(anotherHeaders['x-signature']).to.not.equal(
          hackedRequest['x-signature']
        )
        expect(justAnotherHeaders['x-signature']).to.not.equal(
          hackedRequest['x-signature']
        )
      })
    })

    describe('validateHeaders', function() {
      it('should validate valid headers', async function() {
        const headers: Headers = await getHeaders(userData, request)
        const response = await validateHeaders(provider, request, headers)
        expect(response.success).to.be.equal(true)
        expect(response.error).to.be.equal(undefined)
      })

      it('should throw invalid signature', async function() {
        const headers: Headers = await getHeaders(userData, request)

        let response = await validateHeaders(provider, request, {
          ...headers,
          'x-timestamp': (timestamp + oneMinute).toString()
        })

        await expect(
          response.success,
          'expect invalid signature exception:: timestamp was changed'
        ).to.be.equal(false)
        await expect(
          response.error!.message,
          'expect invalid signature exception:: timestamp was changed'
        ).to.be.equal('Invalid signature')

        response = await validateHeaders(
          provider,
          { ...request, url: 'http://market.decentraland.org/api/v1/land' },
          headers
        )

        await expect(
          response.success,
          'expect invalid signature exception:: url was changed'
        ).to.be.equal(false)
        await expect(
          response.error!.message,
          'expect invalid signature exception:: url was changed'
        ).to.be.equal('Invalid signature')

        response = await validateHeaders(
          provider,
          { ...request, body: Buffer.from('{}') },
          headers
        )

        await expect(
          response.success,
          'expect invalid signature exception:: body was changed'
        ).to.be.equal(false)
        await expect(
          response.error!.message,
          'expect invalid signature exception:: body was changed'
        ).to.be.equal('Invalid signature')
      })

      it('should throw expired keys', async function() {
        this.timeout(999999)
        const headers: Headers = await getHeaders(userData, request)
        const date = new Date()
        date.setSeconds(date.getSeconds() - 1)
        const certificate = await utils.toHex(`
        OtherFields: othervalues
        Expires: ${date.toISOString()}`)
        let response = await validateHeaders(provider, request, {
          ...headers,
          'x-certificate': certificate
        })

        await expect(response.success, 'expect expired keys').to.be.equal(false)
        await expect(
          response.error!.message,
          'expect expired keys'
        ).to.be.equal('Expired keys. Please generate a new pair')
      })

      it('should throw invalid certificate', async function() {
        this.timeout(999999)
        const headers: Headers = await getHeaders(userData, request)
        const date = new Date()
        date.setMonth(date.getMonth() + 1)
        const certificate = await utils.toHex(`
        OtherFields: othervalues
        Expires: ${date.toISOString()}`)
        let response = await validateHeaders(provider, request, {
          ...headers,
          'x-certificate': certificate
        })

        await expect(
          response.success,
          'expect invalid certificate exception:: certificate was changed'
        ).to.be.equal(false)
        await expect(
          response.error!.message,
          'expect invalid certificate exception:: certificate was changed'
        ).to.be.equal('Invalid certificate')

        response = await validateHeaders(provider, request, {
          ...headers,
          'x-certificate-signature':
            '0xae888dea3ff41fa396d780a1a37902e244e56e14a5d3d627b946f8f7af9305db786d5907875a575338c1ebd658f48329d851badf98854cf7cba06e881d7bc0521c'
        })

        await expect(
          response.success,
          'expect invalid certificate exception:: certificate signature was changed'
        ).to.be.equal(false)
        await expect(
          response.error!.message,
          'expect invalid certificate exception:: certificate signature was changed'
        ).to.be.equal('Invalid certificate')
      })

      it('should throw content-length limit exceeded', async function() {
        const headers: Headers = await getHeaders(userData, request)

        const response = await validateHeaders(provider, request, {
          ...headers,
          'content-length': (1024 * 1024 * 11).toString() // 11mb
        })

        await expect(
          response.success,
          'expect content-length limit exceeded'
        ).to.be.equal(false)
        await expect(
          response.error!.message,
          'expect content-length limit exceeded'
        ).to.be.equal(
          `Content size exceeded. Max length is ${MAX_CONTENT_SIZE} bytes`
        )
      })

      it('should throw invalid timeout', async function() {
        this.timeout(9999999)
        const headers: Headers = await getHeaders(userData, request)

        await wait(oneMinute * 1.5)

        const response = await validateHeaders(provider, request, headers)

        await expect(
          response.success,
          'expect invalid timestamp exceptiond'
        ).to.be.equal(false)
        await expect(
          response.error!.message,
          'expect invalid timestamp exception'
        ).to.be.equal('Invalid timestamp')
      })
    })
  })

  after(() => provider.dispose())
})
