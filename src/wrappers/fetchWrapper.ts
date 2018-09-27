import { getHeaders } from '../ephemeralkey/ephemeralkey'
import { UserData } from '../ephemeralkey/types'
import { FetchRequest } from './types'
import { getRequestData } from './commons'

export function wrapFetch(userData: UserData) {
  return fetch => async (url: string, opt: any[]): Promise<Response> => {
    const req = await signRequest(userData, url, opt)
    return fetch(...req)
  }
}

async function signRequest(
  userData: UserData,
  url: string,
  opt: any
): Promise<FetchRequest> {
  const { body, httpRequest, isFormData } = await getRequestData(
    url,
    opt.method,
    opt.body
  )
  const headers = getHeaders(userData, httpRequest)

  const options = {
    ...opt,
    body,
    headers: {
      ...opt.headers,
      ...headers
    }
  }

  if (isFormData) {
    options.headers['Content-Type'] = `multipart/form-data; boundary=${
      opt.body.boundary
    }`
  }

  return [url, options]
}
