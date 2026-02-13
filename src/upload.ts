import * as core from '@actions/core'
import * as fs from 'fs'
import * as crypto from 'crypto'
import * as https from 'https'
import * as http from 'http'
import type { AGCClient } from './agc-client'
import type { UploadUrlResponse, CommonUrlInfo } from './types'

export async function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export async function getUploadUrl(
  client: AGCClient,
  appId: string,
  fileName: string,
  contentLength: number,
  sha256: string,
  releaseType: number
): Promise<UploadUrlResponse> {
  const resp = await client.get<UploadUrlResponse>(
    '/publish/v2/upload-url/for-obs',
    {
      appId,
      fileName,
      contentLength: String(contentLength),
      sha256,
      releaseType: String(releaseType)
    }
  )

  if (resp.ret.code !== 0) {
    throw new Error(`Failed to get upload URL: ${resp.ret.code} ${resp.ret.msg}`)
  }

  core.info(`Got upload URL for ${fileName}`)
  return resp
}

export async function uploadFile(
  urlInfo: CommonUrlInfo,
  filePath: string
): Promise<void> {
  const fileBuffer = fs.readFileSync(filePath)

  return new Promise<void>((resolve, reject) => {
    const parsed = new URL(urlInfo.url)

    // Only use headers from urlInfo — the URL is pre-signed and the signature
    // covers exactly these headers. Extra or missing headers will break the signature.
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(urlInfo.headers)) {
      headers[key.toLowerCase()] = value
    }
    // Ensure content-length matches the actual file size
    headers['content-length'] = String(fileBuffer.length)

    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: urlInfo.method || 'PUT',
      headers
    }

    const proto = parsed.protocol === 'https:' ? https : http
    const req = proto.request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8')
        core.debug(`Upload response: ${res.statusCode} ${raw.substring(0, 500)}`)
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          core.info('File uploaded successfully')
          resolve()
        } else {
          reject(new Error(`Upload failed with HTTP ${res.statusCode}: ${raw}`))
        }
      })
    })

    req.on('error', reject)
    req.end(fileBuffer)
  })
}
