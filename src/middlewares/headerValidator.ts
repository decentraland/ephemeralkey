import { validateHeaders } from '../ephemeralkey/ephemeralkey'

export function headerValidator(provider) {
  return (req, _, next) => {
    let body = new Buffer('')
    req.on('data', function(chunk) {
      console.log(chunk) // @nacho: TODO remove this (testing purpose)
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
          req.headers
        )
        if (isValidRequest) next()
      } catch (error) {
        next(error)
      }
    })
  }
}
