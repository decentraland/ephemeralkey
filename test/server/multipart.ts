/**
 * Multipart Parser (Finite State Machine)
 * usage:
 * const multipart = require('./multipart.js');
 * const body = multipart.DemoData(); 							   // raw body
 * const body = new Buffer(event['body-json'].toString(),'base64'); // AWS case
 * const boundary = multipart.getBoundary(event.params.header['content-type']);
 * const parts = multipart.Parse(body,boundary);
 * each part is:
 * { filename: 'A.txt', type: 'text/plain', data: <Buffer 41 41 41 41 42 42 42 42> }
 *  or { name: 'key', data: <Buffer 41 41 41 41 42 42 42 42> }
 */

type Part = {
  header: string
  info: string
  part: Buffer
}

export function parse(multipartBodyBuffer, boundary) {
  const process = function(part: Part) {
    // will transform this object:
    // { header: 'Content-Disposition: form-data; name="uploads[]"; filename="A.txt"',
    // info: 'Content-Type: text/plain',
    // part: 'AAAABBBB' }
    // into this one:
    // { filename: 'A.txt', type: 'text/plain', data: <Buffer 41 41 41 41 42 42 42 42> }
    const obj = function(str) {
      const k = str.split('=')
      const a = k[0].trim()

      const b = JSON.parse(k[1].trim())
      const o = {}
      Object.defineProperty(o, a, {
        value: b,
        writable: true,
        enumerable: true,
        configurable: true
      })
      return o
    }
    const header = part.header.split(';')

    const filenameData = header[2]
    let input = {}
    if (filenameData) {
      input = obj(filenameData)
      const contentType = part.info.split(':')[1].trim()
      Object.defineProperty(input, 'type', {
        value: contentType,
        writable: true,
        enumerable: true,
        configurable: true
      })
    } else {
      Object.defineProperty(input, 'name', {
        value: header[1].split('=')[1].replace(/"/g, ''),
        writable: true,
        enumerable: true,
        configurable: true
      })
    }

    Object.defineProperty(input, 'data', {
      value: new Buffer(part.part),
      writable: true,
      enumerable: true,
      configurable: true
    })
    return input
  }
  let lastline = ''
  let header = ''
  let info = ''
  let state = 0
  let buffer: any = []
  const allParts: any = []

  for (let i = 0; i < multipartBodyBuffer.length; i++) {
    const oneByte = multipartBodyBuffer[i]
    const prevByte = i > 0 ? multipartBodyBuffer[i - 1] : null
    const newLineDetected = oneByte === 0x0a && prevByte === 0x0d ? true : false
    const newLineChar = oneByte === 0x0a || oneByte === 0x0d ? true : false

    if (!newLineChar) lastline += String.fromCharCode(oneByte)

    if (0 === state && newLineDetected) {
      if ('--' + boundary === lastline) {
        state = 1
      }
      lastline = ''
    } else if (1 === state && newLineDetected) {
      header = lastline
      state = 2
      if (header.indexOf('filename') === -1) {
        state = 3
      }
      lastline = ''
    } else if (2 === state && newLineDetected) {
      info = lastline
      state = 3
      lastline = ''
    } else if (3 === state && newLineDetected) {
      state = 4
      buffer = []
      lastline = ''
    } else if (4 === state) {
      if (lastline.length > boundary.length + 4) lastline = '' // mem save
      if ('--' + boundary === lastline) {
        const j = buffer.length - lastline.length
        const part = buffer.slice(0, j - 1)
        const p = { header: header, info: info, part: part }

        allParts.push(process(p))
        buffer = []
        lastline = ''
        state = 5
        header = ''
        info = ''
      } else {
        buffer.push(oneByte)
      }
      if (newLineDetected) lastline = ''
    } else if (5 === state) {
      if (newLineDetected) state = 1
    }
  }
  return allParts
}

//  read the boundary from the content-type header sent by the http client
//  this value may be similar to:
//  'multipart/form-data; boundary=----WebKitFormBoundaryvm5A9tzU1ONaGP5B',
export function getBoundary(header) {
  const items = header.split(';')
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = new String(items[i]).trim()
      if (item.indexOf('boundary') >= 0) {
        const k = item.split('=')
        return new String(k[1]).trim()
      }
    }
  }
  return ''
}

export function DemoData() {
  let body = 'trash1\r\n'
  body += '------WebKitFormBoundaryvef1fLxmoUdYZWXp\r\n'
  body +=
    'Content-Disposition: form-data; name="uploads[]"; filename="A.txt"\r\n'
  ;(body += 'Content-Type: text/plain\r\n'), (body += '\r\n\r\n')
  body += '@11X'
  body += '111Y\r\n'
  body += '111Z\rCCCC\nCCCC\r\nCCCCC@\r\n\r\n'
  body += '------WebKitFormBoundaryvef1fLxmoUdYZWXp\r\n'
  body +=
    'Content-Disposition: form-data; name="uploads[]"; filename="B.txt"\r\n'
  ;(body += 'Content-Type: text/plain\r\n'), (body += '\r\n\r\n')
  body += '@22X'
  body += '222Y\r\n'
  body += '222Z\r222W\n2220\r\n666@\r\n'
  body += '------WebKitFormBoundaryvef1fLxmoUdYZWXp--\r\n'
  return new Buffer(body, 'utf-8')
  // returns a Buffered payload, so the it will be treated as a binary content.
}
