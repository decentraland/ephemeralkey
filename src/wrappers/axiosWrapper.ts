import * as ReadableStreamClone from 'readable-stream-clone'

import { getHeaders } from '../ephemeralkey/ephemeralkey'
import { streamToBuffer, isStream } from '../helpers/dataHelper'
import { UserData, HTTPRequest } from '../ephemeralkey/types'

export function wrapAxios(userData: UserData) {
  return axios =>
    axios.interceptors.request.use(
      async config => {
        const timestamp = Date.now()
        let body = config.data

        const shouldSendStream = isStream(config.data)

        if (shouldSendStream) {
          body = new ReadableStreamClone(config.data)
        }

        const buffer: any = shouldSendStream
          ? await streamToBuffer(config.data)
          : config.data

        const request: HTTPRequest = {
          method: config.method.toUpperCase(),
          body: Buffer.from(buffer),
          url: config.url,
          timestamp
        }

        const headers = getHeaders(userData, request)

        return {
          ...config,
          data: body,
          headers: {
            ...config.headers,
            common: {
              ...config.headers['common'],
              ...headers
            }
          }
        }
      },
      function(error) {
        return Promise.reject(error)
      }
    )
}
