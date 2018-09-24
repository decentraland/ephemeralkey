import * as Stream from 'stream'

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
