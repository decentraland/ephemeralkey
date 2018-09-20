import * as secp256k1 from 'secp256k1'
import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import { w3cwebsocket } from 'websocket'
import { RequestManager, providers } from 'eth-connect'

import { wait } from './helpers'

chai.use(chaiAsPromised)
const expect = chai.expect

import {
  generateEphemeralKeys,
  getHeaders,
  decodeIdentity,
  getMethodMessage,
  validateHeaders,
  MAX_CONTENT_SIZE
} from '../src/ephemeralkey/ephemeralkey'

import {
  UserData,
  HTTPRequest,
  Headers,
  Identity,
  ServerHeaders
} from '../src/ephemeralkey/types'

const inviteAddress = '0x12345'
const inviteTokenId = '1'
const url = 'http://market.decentraland.org/api/v1/marketplace'
const timestamp = Date.now()
const oneMinute = 1000 * 60

const request: HTTPRequest = {
  method: 'POST',
  body: JSON.stringify({ param1: 'data1', param2: 'data2' }),
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
      const {
        address,
        signature,
        message,
        ephemeralPublicKey,
        ephemeralPrivateKey
      } = await generateEphemeralKeys(provider, inviteAddress, inviteTokenId)

      const accounts = await requestManager.eth_accounts()
      expect(signature.length).to.gt(0)
      expect(message.length).to.gt(0)
      expect(ephemeralPublicKey.length).to.gt(0)
      expect(ephemeralPrivateKey.length).to.gt(0)
      expect(address).to.equal(accounts[0])
      expect(ephemeralPublicKey).to.not.equal(ephemeralPrivateKey)

      const recoveredPublicKey = await requestManager.personal_ecRecover(
        message,
        signature
      )

      expect(recoveredPublicKey).to.equal(accounts[0])
    })

    it('should generate different user data when generate', async function() {
      const response1: UserData = await generateEphemeralKeys(
        provider,
        inviteAddress,
        inviteTokenId
      )

      const response2: UserData = await generateEphemeralKeys(
        provider,
        inviteAddress,
        inviteTokenId
      )

      expect(response1).to.not.deep.equal(response2)
    })
  })

  describe('With generated ephemeral keys', function() {
    let userData: UserData

    it('should generate user data', async function() {
      userData = await generateEphemeralKeys(
        provider,
        inviteAddress,
        inviteTokenId
      )
    })

    describe('getHeaders', function() {
      it('should get headers', async function() {
        const headers: Headers = await getHeaders(userData, request)
        const accounts = await requestManager.eth_accounts()
        const identity: Identity = decodeIdentity(headers['X-Identity'])

        expect(identity.ephemeralPublicKey).to.equal(
          userData.ephemeralPublicKey
        )
        expect(identity.publicKey).to.equal(accounts[0])
        expect(headers['X-Signature'].length).to.gt(0)
        expect(
          secp256k1.verify(
            getMethodMessage(request),
            Buffer.from(headers['X-Signature'], 'hex'),
            Buffer.from(userData.ephemeralPublicKey, 'hex')
          ),
          'verify signature'
        ).to.equal(true)
        expect(headers['X-Certificate']).to.equal(userData.message)
        expect(headers['X-Certificate-Signature']).to.equal(userData.signature)
      })

      it('should get different signature for each request', async function() {
        const headers: Headers = await getHeaders(userData, request)
        const anotherHeaders: Headers = await getHeaders(userData, {
          ...request,
          url: 'http://market.decentraland.org/api/v1/land'
        })
        const justAnotherHeaders: Headers = await getHeaders(userData, {
          ...request,
          body: '{}'
        })
        const hackedRequest: Headers = await getHeaders(userData, {
          ...request,
          timestamp: timestamp + 1
        })

        expect(headers['X-Signature']).to.not.equal(
          anotherHeaders['X-Signature']
        )
        expect(headers['X-Signature']).to.not.equal(
          justAnotherHeaders['X-Signature']
        )
        expect(headers['X-Signature']).to.not.equal(
          hackedRequest['X-Signature']
        )
        expect(anotherHeaders['X-Signature']).to.not.equal(
          justAnotherHeaders['X-Signature']
        )
        expect(anotherHeaders['X-Signature']).to.not.equal(
          hackedRequest['X-Signature']
        )
        expect(justAnotherHeaders['X-Signature']).to.not.equal(
          hackedRequest['X-Signature']
        )
      })
    })

    describe('validateHeaders', function() {
      it('should validate valid headers', async function() {
        const headers: Headers = await getHeaders(userData, request)
        const isValid = await validateHeaders(provider, request, {
          ...headers,
          'Content-Length': '64000'
        })
        expect(isValid).to.be.equal(true)
      })

      it('should throw invalid content length', async function() {
        const headers: Headers = await getHeaders(userData, request)
        await expect(
          validateHeaders(provider, request, {
            ...headers,
            'Content-Length': '66000'
          })
        ).to.be.rejectedWith(
          `Content size exceeded. Max length is ${MAX_CONTENT_SIZE} bytes`
        )
      })

      it('should throw invalid signature', async function() {
        const headers: Headers = await getHeaders(userData, request)
        const serverHeaders: ServerHeaders = {
          ...headers,
          'Content-Length': '64000'
        }
        await expect(
          validateHeaders(provider, request, {
            ...serverHeaders,
            'X-Timestamp': (timestamp + oneMinute).toString()
          }),
          'expect invalid signature exception:: timestamp was changed'
        ).to.be.rejectedWith('Invalid signature')

        await expect(
          validateHeaders(
            provider,
            { ...request, url: 'http://market.decentraland.org/api/v1/land' },
            serverHeaders
          ),
          'expect invalid signature exception:: url was changed'
        ).to.be.rejectedWith('Invalid signature')

        await expect(
          validateHeaders(provider, { ...request, body: '{}' }, serverHeaders),
          'expect invalid signature exception:: body was changed'
        ).to.be.rejectedWith('Invalid signature')
      })

      it('should throw invalid certificate', async function() {
        this.timeout(999999)
        const headers: Headers = await getHeaders(userData, request)
        const serverHeaders: ServerHeaders = {
          ...headers,
          'Content-Length': '64000'
        }

        await expect(
          validateHeaders(provider, request, {
            ...serverHeaders,
            'X-Certificate':
              '0x446563656e7472616c616e642041636365737320417574680a4b65793a203033316636623461346530313437356663393736323634353930626436346135333933333866323864623839633361313466343035333734323061343637656236642e0a546f6b656e3a20756e6b6e6f776e3a2f2f307831323334352f310a446174653a205765642053657020313920323031382031353a30323a313320474d542d3033303020282d3033290a457870697265733a205765642053657020313920323031382031353a30323a313320474d542d3033303020282d30332920'
          }),
          'expect invalid certificate exception:: certificate was changed'
        ).to.be.rejectedWith('Invalid certificate')

        await expect(
          validateHeaders(provider, request, {
            ...serverHeaders,
            'X-Certificate-Signature':
              '0xae888dea3ff41fa396d780a1a37902e244e56e14a5d3d627b946f8f7af9305db786d5907875a575338c1ebd658f48329d851badf98854cf7cba06e881d7bc0521c'
          }),
          'expect invalid certificate exception:: certificate signature was changed'
        ).to.be.rejectedWith('Invalid certificate')
      })

      it('should throw invalid timeout', async function() {
        this.timeout(9999999)
        const headers: Headers = await getHeaders(userData, request)
        const serverHeaders: ServerHeaders = {
          ...headers,
          'Content-Length': '64000'
        }

        await wait(oneMinute * 1.5)

        await expect(
          validateHeaders(provider, request, serverHeaders),
          'expect invalid timestamp exception'
        ).be.rejectedWith('Invalid timestamp')
      })
    })
  })

  after(() => provider.dispose())
})
