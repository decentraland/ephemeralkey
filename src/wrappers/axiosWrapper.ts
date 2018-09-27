import { getHeaders } from '../ephemeralkey/ephemeralkey'
import { UserData } from '../ephemeralkey/types'
import { getRequestData } from './commons'

export function wrapAxios(userData: UserData) {
  return axios =>
    axios.interceptors.request.use(
      async config => {
        const { body, httpRequest, isFormData } = await getRequestData(
          config.url,
          config.method,
          config.data
        )
        const headers = getHeaders(userData, httpRequest)

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
