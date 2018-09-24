import * as chai from 'chai'
import fetch from 'node-fetch'
import * as fs from 'fs'
// import * as FormData from 'form-data'
// import FormData from 'formdata-node'

const expect = chai.expect

import { generateEphemeralKeys } from '../src/ephemeralkey/ephemeralkey'
import { UserData } from '../src/ephemeralkey/types'
import { wrapFetch } from '../src/wrappers'
import { testWithServer } from './helpers/end2end'

const url = 'http://localhost:3001/'
let wrappedFetch

const request: any = {
  method: 'POST',
  body: JSON.stringify({ param1: 'data1', param2: 'data2' }),
  headers: {
    'Content-Type': 'application/json'
  }
}

describe('FetchWrapper', function() {
  testWithServer(doTest)
})

function doTest(provider: any) {
  const file = fs.createWriteStream('fetch.txt')

  for (let i = 0; i <= 25000; i++) {
    // ~ 11mb file
    file.write(
      'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n'
    )
  }

  file.end()

  const inviteAddress = '0x12345'
  const inviteTokenId = '1'
  let userData: UserData

  it('should wrap fetch', async function() {
    userData = await generateEphemeralKeys(
      provider,
      inviteAddress,
      inviteTokenId
    )

    wrappedFetch = wrapFetch(userData)(fetch)
  })

  it('should get', async function() {
    const res = await wrappedFetch(url, { method: 'GET' })
    expect(res.status).to.be.equal(200)
  })

  it('should post json', async function() {
    const res = await wrappedFetch(url, request)
    expect(res.status).to.be.equal(200)
  })

  it('should post stream', async function() {
    const stream = fs.createReadStream('fetch.txt')
    const res = await wrappedFetch(url, {
      method: 'POST',
      body: stream
    })
    fs.unlinkSync('fetch.txt')
    expect(res.status).to.be.equal(200)
  })
}
