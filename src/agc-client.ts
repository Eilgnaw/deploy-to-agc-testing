import * as core from '@actions/core'
import * as https from 'https'
import * as http from 'http'
import type { TokenResponse } from './types'

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

    const data = await this.rawRequest<TokenResponse>(
      'POST',
      `${BASE_URL}/oauth2/v1/token`,
      body,
      { 'Content-Type': 'application/json' }
    )
    this.token = data.access_token
    core.setSecret(this.token)
    core.info('Successfully authenticated with AGC')
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
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const url = `${BASE_URL}${path}`
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
