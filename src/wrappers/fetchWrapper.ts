import * as ReadableStreamClone from 'readable-stream-clone'
import * as fetchPonyfill from 'fetch-ponyfill'
const { Request } = fetchPonyfill()

import { getHeaders } from '../ephemeralkey/ephemeralkey'
import { streamToBuffer, isStream } from '../helpers/dataHelper'
import { UserData, HTTPRequest } from '../ephemeralkey/types'

export function wrapFetch(userData: UserData) {
  return fetch => async (...args): Promise<Response> => {
    const req = await signRequest(userData, args)
    return fetch(...req)
  }
}

async function signRequest(userData: UserData, args): Promise<any[]> {
  const timestamp = Date.now()
  const [url, opt] = args
  let body = opt.body
  const shouldSendStream = isStream(opt.body)
  if (shouldSendStream) {
    body = new ReadableStreamClone(opt.body)
  }
  const req = new Request(url, opt) // simulate Fetch Request

  const request: HTTPRequest = {
    method: req.method,
    body: Buffer.from(
      shouldSendStream
        ? ((await streamToBuffer(opt.body)) as Buffer)
        : opt.body || ''
    ),
    url,
    timestamp
  }
  const headers = getHeaders(userData, request)

  return [
    url,
    {
      ...opt,
      body,
      headers: {
        ...opt.headers,
        // 'content-type': req.headers.get('content-type'),
        ...headers
      }
    }
  ]
}
