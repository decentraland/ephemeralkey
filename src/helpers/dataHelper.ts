import * as Stream from 'stream'
import formDataNode from 'formdata-node'

export async function streamToBuffer(stream: any) {
  return new Promise((resolve, reject) => {
    let buffers: any[] = []
    stream.on('error', reject)
    stream.on('data', data => buffers.push(data))
    stream.on('end', () => resolve(Buffer.concat(buffers)))
  })
}

export function isStream(body: Stream): boolean {
  return (
    body && typeof body.on === 'function' && typeof body.pipe === 'function'
  )
}

export function createFormData(param) {
  const formData = new formDataNode()
  for (let key in param) {
    let value = param[key]
    if (value.toString() === '[object Blob]') {
      // const reader = new FileReader()
      // reader.readAsArrayBuffer(value)
      // value = Buffer.from(value, 'binary')
    }
    formData.append(key, ...value)
  }
  return formData
}
