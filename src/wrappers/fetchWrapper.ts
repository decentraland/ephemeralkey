import { getHeaders } from '../ephemeralkey/ephemeralkey'
import { UserData, HTTPRequest } from '../ephemeralkey/types'
import * as fetchPonyfill from 'fetch-ponyfill'
const { Request } = fetchPonyfill()

export function wrapFetch(userData: UserData) {
  return fetch => async (...args): Promise<Response> => {
    const req = await signRequest(userData, args)
    return fetch(...req)
  }
}

async function signRequest(userData: UserData, args): Promise<any[]> {
  const timestamp = Date.now()
  const [url, opt] = args
  // const { PassThrough } = require('stream')
  // const copyStream = new PassThrough()
  // copy source stream into PassThrough stream
  // opt.body.pipe(copyStream)
  const req = new Request(url, opt) // simulate Fetch Request

  const body = await req.text()

  const request: HTTPRequest = {
    method: req.method,
    body: Buffer.from(body),
    url,
    timestamp
  }
  const headers = getHeaders(userData, request)

  return [
    url,
    {
      ...opt,
      // body: copyStream,
      headers: {
        ...opt.headers,
        // 'content-type': req.headers.get('content-type'),
        ...headers
      }
    }
  ]
}
