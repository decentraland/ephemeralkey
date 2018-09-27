import { w3cwebsocket } from 'websocket'
import { providers } from 'eth-connect'

let app
if (process.env.PORT) {
  app = require('../server/server')
}

export function testWithServer(doTest: (provider: any, port: string) => void) {
  let server: any | null = null
  describe('Test with server', function() {
    this.timeout(99999999)
    it('should start the server', () => {
      if (app) {
        server = app.listen(process.env.PORT, () => console.log('ready'))
      }
    })

    const provider = new providers.WebSocketProvider('ws://127.0.0.1:8546', {
      WebSocketConstructor: w3cwebsocket
    })
    const port = process.env.PORT || process.env.PORT_TO_USE

    doTest(provider, port!)

    it('should close the server & dispose provider', function() {
      provider.dispose()

      if (server) {
        server.close()
      }
    })
  })
}
