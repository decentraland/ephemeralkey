const axios = require('axios')
const { w3cwebsocket } = require('websocket')
const { providers } = require('eth-connect')

const {
  generateEphemeralKeys,
  wrapAxios,
  wrapFetch,
  createFormData
} = require('../../dist')

const expect = chai.expect
const provider = new providers.WebSocketProvider('ws://127.0.0.1:8546', {
  WebSocketConstructor: w3cwebsocket
})

async function getFormData() {
  let file = ''
  for (let i = 0; i <= 1000; i++) {
    file +=
      'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n'
  }
  const bud = Buffer.from(file)
  const blob = new window.Blob([new window.Uint8Array(bud)])
  blob.name = 'axios.txt'
  async function toBuffer(blob) {
    const reader = new window.FileReader()
    return new Promise(r => {
      function onLoadEnd(e) {
        reader.removeEventListener('loadend', onLoadEnd, false)
        if (e.error) r(e.error)
        else r(Buffer.from(reader.result))
      }
      reader.addEventListener('loadend', onLoadEnd, false)
      reader.readAsArrayBuffer(blob)
    })
  }
  const buf = await toBuffer(blob)
  formData = createFormData({
    name: ['Decentraland'],
    domain: ['org'],
    the_file: [buf, 'axios.txt']
  })
  return formData
}

describe('main', function() {
  this.timeout(99999999)

  describe('Axios', function() {
    const axiosInstance = axios.create()
    it('should generate user data and setup axios', async function() {
      userData = await generateEphemeralKeys(provider, 'tokenAddress')
      wrapAxios(userData)(axiosInstance)
    })

    it('should GET', async function() {
      const res = await axiosInstance('http://localhost:3001/', {
        method: 'GET',
        data: ''
      })
      expect(res.status).to.be.equal(200)
    })
    it('should POST data', async function() {
      const res = await axiosInstance('http://localhost:3001/', {
        method: 'POST',
        data: JSON.stringify({ name: 'Decentraland', domain: 'org' })
      })
      expect(res.status).to.be.equal(200)
    })

    it('should POST multipart-data', async function() {
      const formData = await getFormData()
      const res = await axiosInstance('http://localhost:3001/multipart', {
        method: 'POST',
        data: formData
      })
      expect(res.status).to.be.equal(200)
    })
  })

  describe('Fetch', function() {
    let wrappedFetch
    it('should generate user data and setup fetch', async function() {
      userData = await generateEphemeralKeys(provider, 'tokenAddress')
      wrappedFetch = wrapFetch(userData)(window.fetch)
    })

    it('should GET', async function() {
      const res = await wrappedFetch('http://localhost:3001/', {
        method: 'GET'
      })
      expect(res.status).to.be.equal(200)
    })

    it('should POST', async function() {
      const res = await wrappedFetch('http://localhost:3001/', {
        method: 'POST',
        body: JSON.stringify({ name: 'Decentraland', domain: 'org' })
      })
      expect(res.status).to.be.equal(200)
    })

    it('should POST multipart-data', async function() {
      const formData = await getFormData()
      const res = await wrappedFetch('http://localhost:3001/multipart', {
        method: 'POST',
        body: formData
      })
      expect(res.status).to.be.equal(200)
    })
  })
})
