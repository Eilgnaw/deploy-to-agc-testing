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
  return truncateText(content, maxLength)
}

export function truncateTestContent(content: string, maxLength = 1024): string {
  return truncateText(content, maxLength)
}

export function toAgcLanguage(language: string): string {
  const languageMap: Record<string, string> = {
    'zh-Hans': 'zh-CN',
    en: 'en-US'
  }

  return languageMap[language] || language
}

function truncateText(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content
  }
  return content.substring(0, maxLength)
}
