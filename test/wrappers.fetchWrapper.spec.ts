import * as chai from 'chai'
import fetch from 'node-fetch'
// import * as FormData from 'form-data'
import FormData from 'formdata-node'

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

  it('should post json', async function() {
    const res = await wrappedFetch(url, request)
    expect(res.status).to.be.equal(200)
  })

  it.skip('should post multipart', async function() {
    const formData = new FormData()

    formData.append('blob', 'test')
    formData.append('data', 'test2')

    const res = await wrappedFetch(url, {
      method: 'POST',
      body: formData
    })
    expect(res.status).to.be.equal(200)
  })
}
