import { validateHeaders } from '../ephemeralkey/ephemeralkey'

export function headerValidator(provider) {
  return async (req, _, next) => {
    let body = new Buffer('')
    req.on('data', function(chunk) {
      body = Buffer.concat([body, chunk])
    })

    req.on('end', async function() {
      try {
        const isValidRequest = await validateHeaders(
          provider,
          {
            method: req.method,
            url: req.protocol + '://' + req.get('host') + req.originalUrl,
            timestamp: req.headers['x-timestamp'],
            body
          },
          { ...req.headers, 'content-length': body.byteLength }
        )
        if (isValidRequest) {
          req.rawBody = body
          next()
        }
      } catch (error) {
        next(error)
      }
    })
  }
}
