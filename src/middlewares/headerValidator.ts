import { validateHeaders } from '../ephemeralkey/ephemeralkey'

export function headerValidator(provider) {
  return async (req, _, next) => {
    let body = Buffer.from('')
    req.on('data', function(chunk) {
      body = Buffer.concat([body, chunk])
    })

    req.on('end', async function() {
      const response = await validateHeaders(
        provider,
        {
          method: req.method,
          url: req.protocol + '://' + req.get('host') + req.originalUrl,
          timestamp: req.headers['x-timestamp'],
          body
        },
        { ...req.headers, 'content-length': body.byteLength }
      )
      if (response.error) {
        next(response.error)
      }
      req.rawBody = body
      next()
    })
  }
}
