import { w3cwebsocket } from 'websocket'
import { providers } from 'eth-connect'

const app = require('../server/server')

export function testWithServer(doTest: (provider: any) => void) {
  let server
  describe('Test with server', function() {
    it('should start the server', () => {
      server = app.listen(3001, () => console.log('ready'))
    })
    this.timeout(99999999)

    const provider = new providers.WebSocketProvider('ws://127.0.0.1:8546', {
      WebSocketConstructor: w3cwebsocket
    })

    doTest(provider)

    it('should close the server & dispose provider', function() {
      provider.dispose()
      server.close()
    })
  })
}
