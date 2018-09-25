import * as ReadableStreamClone from 'readable-stream-clone'
import * as fetchPonyfill from 'fetch-ponyfill'
const { Request } = fetchPonyfill()
// import fetch from 'node-fetch'

// import * as FormData from 'form-data'

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
  let request: HTTPRequest
  let body = opt.body

  const isFormData = opt.body && opt.body.toString() === '[object FormData]'
  const shouldSendStream = isStream(isFormData ? opt.body.stream : opt.body)
  if (shouldSendStream) {
    body = new ReadableStreamClone(isFormData ? opt.body.stream : opt.body)
  }

  request = {
    method: opt.method,
    body: Buffer.from(
      shouldSendStream
        ? ((await streamToBuffer(
            isFormData ? opt.body.stream : opt.body
          )) as Buffer)
        : opt.body || ''
    ),
    url,
    timestamp
  }

  if (typeof window !== 'undefined' && isFormData) {
    body = request.body
  }

  const headers = getHeaders(userData, request)
  return [
    url,
    {
      ...opt,
      body,
      headers: {
        ...opt.headers,
        'Content-Type': isFormData
          ? `multipart/form-data; boundary=${opt.body.boundary}`
          : new Request(url, opt).headers.get('content-type'),
        ...headers
      }
    }
  ]
}
