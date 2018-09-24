import { getHeaders } from '../ephemeralkey/ephemeralkey'
import { UserData, HTTPRequest } from '../ephemeralkey/types'

export function wrapAxios(userData: UserData) {
  return axios =>
    axios.interceptors.request.use(
      async config => {
        const timestamp = Date.now()
        const buffer: any =
          typeof config.data !== 'string'
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
          data: buffer,
          headers: {
            ...config.headers,
            common: { ...config.headers['common'], ...headers }
          }
        }
      },
      function(error) {
        return Promise.reject(error)
      }
    )
}

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    let buffers: any[] = []
    stream.on('error', reject)
    stream.on('data', data => buffers.push(data))
    stream.on('end', () => resolve(Buffer.concat(buffers)))
  })
}
