import * as ReadableStreamClone from 'readable-stream-clone'

import { streamToBuffer, isStream } from '../helpers/dataHelper'
import { HTTPRequest } from '../ephemeralkey/types'

export async function getRequestData(url: string, method: string, data: any) {
  const timestamp = Date.now()
  let body = data
  let buffer = data || ''

  const isFormData = body && body.toString() === '[object FormData]'
  const shouldSendStream = isStream(isFormData ? body.stream : body)

  if (shouldSendStream) {
    const stream = isFormData ? body.stream : body
    body = new ReadableStreamClone(stream)
    buffer = await streamToBuffer(stream)
  }

  const httpRequest: HTTPRequest = {
    method: method.toUpperCase(),
    body: Buffer.from(buffer),
    url,
    timestamp
  }

  if (typeof window !== 'undefined' && isFormData) {
    // if the lib is used by client-side send buffer instead of stream
    body = httpRequest.body
  }

  return { body, httpRequest, isFormData }
}
