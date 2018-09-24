import * as chai from 'chai'
import axios from 'axios'

const expect = chai.expect

import { wrapAxios } from '../src/wrappers'
import { UserData } from '../src/ephemeralkey/types'
import { generateEphemeralKeys } from '../src/ephemeralkey/ephemeralkey'
import { testWithServer } from './helpers/end2end'

const url = 'http://localhost:3001/'

const request: any = {
  method: 'POST',
  data: JSON.stringify({ param1: 'data1', param2: 'data2' }),
  headers: {
    'Content-Type': 'application/json'
  }
}

describe('AxiosWrapper', function() {
  testWithServer(doTest)
})

function doTest(provider: any) {
  const inviteAddress = '0x12345'
  const inviteTokenId = '1'
  let userData: UserData
  it('should generate ephemeral keys', async function() {
    userData = await generateEphemeralKeys(
      provider,
      inviteAddress,
      inviteTokenId
    )
    wrapAxios(userData)(axios)
  })

  it('should post json', async function() {
    const res = await axios(url, request)
    expect(res.status).to.be.equal(200)
  })

  it('should post multipart', async function() {
    const fs = require('fs')
    const file = fs.createWriteStream('file.txt')

    for (let i = 0; i <= 1000; i++) {
      file.write(
        'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n'
      )
    }

    file.end()

    const stream = fs.createReadStream('file.txt')

    const res = await axios({
      method: 'POST',
      data: stream,
      url
    })
    fs.unlinkSync('file.txt')
    expect(res.status).to.be.equal(200)
  })
}
