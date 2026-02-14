import * as core from '@actions/core'
import * as crypto from 'crypto'
import * as https from 'https'
import * as http from 'http'
import type { TokenResponse, ServiceAccountCredentials } from './types'

const BASE_URL = 'https://connect-api.cloud.huawei.com/api'

export class AGCClient {
  private token = ''
  private clientId = ''

  async authenticate(clientId: string, clientSecret: string): Promise<void> {
    this.clientId = clientId
    const body = JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })

    const data = await this.rawRequest<TokenResponse & { ret?: { code: number; msg: string } }>(
      'POST',
      `${BASE_URL}/oauth2/v1/token`,
      body,
      { 'Content-Type': 'application/json' }
    )

    if (data.ret) {
      throw new Error(`Failed to authenticate: ${data.ret.code} ${data.ret.msg}`)
    }
    if (!data.access_token) {
      throw new Error('Failed to authenticate: no access_token in response')
    }

    this.token = data.access_token
    core.setSecret(this.token)
    core.info('Successfully authenticated with AGC')
  }

  async authenticateWithServiceAccount(credentialsJson: string): Promise<void> {
    const creds = this.parseServiceAccountCredentials(credentialsJson)
    const jwt = this.buildJwt(creds)

    this.token = jwt
    this.clientId = creds.sub_account
    core.setSecret(this.token)
    core.info('Successfully authenticated with AGC using service account')
  }

  async get<T>(
    path: string,
    query?: Record<string, string>,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    let url = `${BASE_URL}${path}`
    if (query) {
      const params = new URLSearchParams(query)
      url += `?${params.toString()}`
    }
    const headers = { ...this.defaultHeaders(), ...extraHeaders }
    return this.rawRequest<T>('GET', url, undefined, headers)
  }

  async post<T>(
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
    query?: Record<string, string>
  ): Promise<T> {
    let url = `${BASE_URL}${path}`
    if (query) {
      const params = new URLSearchParams(query)
      url += `?${params.toString()}`
    }
    const headers = { ...this.defaultHeaders(), ...extraHeaders }
    const payload = body ? JSON.stringify(body) : undefined
    return this.rawRequest<T>('POST', url, payload, headers)
  }

  async put<T>(
    path: string,
    body?: unknown,
    query?: Record<string, string>,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    let url = `${BASE_URL}${path}`
    if (query) {
      const params = new URLSearchParams(query)
      url += `?${params.toString()}`
    }
    const headers = { ...this.defaultHeaders(), ...extraHeaders }
    const payload = body ? JSON.stringify(body) : undefined
    return this.rawRequest<T>('PUT', url, payload, headers)
  }

  private parseServiceAccountCredentials(json: string): ServiceAccountCredentials {
    let creds: ServiceAccountCredentials
    try {
      creds = JSON.parse(json)
    } catch {
      throw new Error('Invalid service account JSON: failed to parse')
    }
    const required: (keyof ServiceAccountCredentials)[] = [
      'key_id', 'private_key', 'sub_account', 'token_uri'
    ]
    for (const field of required) {
      if (!creds[field]) {
        throw new Error(`Invalid service account JSON: missing required field "${field}"`)
      }
    }
    return creds
  }

  private buildJwt(creds: ServiceAccountCredentials): string {
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'PS256', typ: 'JWT', kid: creds.key_id }
    const payload = {
      iss: creds.sub_account,
      aud: creds.token_uri,
      iat: now,
      exp: now + 3600
    }

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload))
    const signingInput = `${encodedHeader}.${encodedPayload}`

    const signature = crypto.sign('sha256', Buffer.from(signingInput), {
      key: creds.private_key,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
    })

    return `${signingInput}.${this.base64UrlEncodeBuffer(signature)}`
  }

  private base64UrlEncode(str: string): string {
    return Buffer.from(str, 'utf-8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  private base64UrlEncodeBuffer(buf: Buffer): string {
    return buf.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }

  private defaultHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      client_id: this.clientId,
      'Content-Type': 'application/json'
    }
  }

  private rawRequest<T>(
    method: string,
    url: string,
    body?: string,
    headers?: Record<string, string>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const parsed = new URL(url)
      const options: https.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method,
        headers: headers || {}
      }

      const proto = parsed.protocol === 'https:' ? https : http
      const req = proto.request(options, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8')
          core.debug(`${method} ${url} => ${res.statusCode} ${raw.substring(0, 500)}`)
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${raw}`))
            return
          }
          try {
            resolve(JSON.parse(raw) as T)
          } catch {
            reject(new Error(`Failed to parse response: ${raw}`))
          }
        })
      })

      req.on('error', reject)

      if (body) {
        req.write(body)
      }
      req.end()
    })
  }
}
