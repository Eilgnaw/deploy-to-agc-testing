import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'

export interface WhatToTestResult {
  locale: string
  content: string
}

export async function readWhatToTest(
  dir: string,
  language: string
): Promise<WhatToTestResult> {
  const fileName = `WhatToTest.${language}.txt`
  const filePath = path.join(dir, fileName)

  if (!fs.existsSync(filePath)) {
    core.warning(`WhatToTest file not found: ${filePath}`)
    return { locale: language, content: '' }
  }

  const content = fs.readFileSync(filePath, 'utf-8').trim()
  core.info(`Read WhatToTest file: ${filePath} (${content.length} chars)`)

  return { locale: language, content }
}

export function truncateTestDesc(content: string, maxLength = 50): string {
  if (content.length <= maxLength) {
    return content
  }
  return content.substring(0, maxLength)
}
