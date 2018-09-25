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

        const isFormData =
          config.data && config.data.toString() === '[object FormData]'

        const shouldSendStream = isStream(
          isFormData ? config.data.stream : config.data
        )

        if (shouldSendStream) {
          body = new ReadableStreamClone(
            isFormData ? config.data.stream : config.data
          )
        }

        const buffer: any = shouldSendStream
          ? await streamToBuffer(isFormData ? config.data.stream : config.data)
          : config.data || ''

        const request: HTTPRequest = {
          method: config.method.toUpperCase(),
          body: Buffer.from(buffer),
          url: config.url,
          timestamp
        }

        const headers = getHeaders(userData, request)
        if (
          typeof window !== 'undefined' &&
          config.data.toString() === '[object FormData]'
        ) {
          body = buffer
        }
        return {
          ...config,
          data: body,
          headers: {
            ...config.headers,
            [config.method]: {
              ...config.headers[config.method],
              'Content-Type': isFormData
                ? `multipart/form-data; boundary=${config.data.boundary}`
                : config.headers[config.method]['Content-Type'] || '',
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
