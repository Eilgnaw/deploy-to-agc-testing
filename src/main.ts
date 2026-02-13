import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import { AGCClient } from './agc-client'
import { computeFileSha256, getUploadUrl, uploadFile } from './upload'
import {
  createTestVersion,
  addTestPackage,
  pollCompileStatus,
  updateTestVersion,
  submitTestVersion,
  findOrCreateTestGroup,
  generateInviteCode
} from './testing'
import { readWhatToTest, truncateTestDesc } from './what-to-test'

async function run(): Promise<void> {
  try {
    // 1. Read action inputs
    const clientId = core.getInput('client-id', { required: true })
    const clientSecret = core.getInput('client-secret', { required: true })
    const appId = core.getInput('app-id', { required: true })
    const appPath = core.getInput('app-path', { required: true })
    const whatToTestDir = core.getInput('what-to-test-dir') || 'APPTest'
    const language = core.getInput('language') || 'zh-Hans'
    const testDescInput = core.getInput('test-desc')
    const releaseType = parseInt(core.getInput('release-type') || '6', 10)
    const testType = parseInt(core.getInput('test-type') || '3', 10)
    const testGroupName = core.getInput('test-group-name')
    const generateInviteCodeFlag = core.getInput('generate-invite-code') !== 'false'
    const inviteCodeValidDays = parseInt(core.getInput('invite-code-valid-days') || '7', 10)
    const inviteCodeInviteLimit = parseInt(core.getInput('invite-code-invite-limit') || '1000', 10)

    // Validate app-path
    const resolvedAppPath = path.resolve(appPath)
    if (!fs.existsSync(resolvedAppPath)) {
      throw new Error(`App file not found: ${resolvedAppPath}`)
    }

    const ext = path.extname(resolvedAppPath).toLowerCase()
    if (ext !== '.hap' && ext !== '.app') {
      throw new Error(`Unsupported file format: ${ext}. Only .hap and .app are supported.`)
    }

    // 2. Read WhatToTest file
    const whatToTest = await readWhatToTest(whatToTestDir, language)
    const testDesc = testDescInput || truncateTestDesc(whatToTest.content)
    if (!testDesc) {
      core.warning('No test description provided and WhatToTest file is empty')
    }

    // 3. Authenticate
    core.info('Authenticating with AGC...')
    const client = new AGCClient()
    await client.authenticate(clientId, clientSecret)

    // 4. Compute file SHA256 and get file size
    const fileName = path.basename(resolvedAppPath)
    const fileStats = fs.statSync(resolvedAppPath)
    const contentLength = fileStats.size
    core.info(`File: ${fileName}, size: ${contentLength} bytes`)

    const sha256 = await computeFileSha256(resolvedAppPath)
    core.info(`SHA256: ${sha256}`)

    // 5. Get upload URL
    core.info('Getting upload URL...')
    const uploadUrlResp = await getUploadUrl(
      client, appId, fileName, contentLength, sha256, releaseType
    )
    const { urlInfo } = uploadUrlResp

    // 6. Upload file
    core.info('Uploading app package...')
    await uploadFile(urlInfo, resolvedAppPath)

    // 7. Create test version
    core.info('Creating test version...')
    const versionId = await createTestVersion(client, appId, {
      releaseType,
      testType,
      testDesc
    })
    core.setOutput('version-id', versionId)

    // 8. Add test package
    core.info('Adding test package...')
    const pkgVersion = await addTestPackage(
      client, appId, fileName, urlInfo.objectId
    )
    core.setOutput('pkg-version', pkgVersion)

    // 9. Poll compile status
    core.info('Waiting for package compilation...')
    const pkgId = await pollCompileStatus(client, appId, pkgVersion)

    // 10. Find or create test group (if configured)
    let groupId: string | undefined
    if (testGroupName) {
      core.info(`Finding or creating test group: ${testGroupName}`)
      groupId = await findOrCreateTestGroup(client, appId, testGroupName)
      core.setOutput('group-id', groupId)
    }

    // 11. Update test version (bind pkgId + test group)
    core.info('Updating test version...')
    await updateTestVersion(client, appId, {
      versionId,
      pkgId,
      groupId
    })

    // 12. Submit test version for review
    core.info('Submitting test version for review...')
    await submitTestVersion(client, appId, versionId)

    // 13. Generate invitation code (if enabled and group exists)
    if (generateInviteCodeFlag && groupId) {
      core.info('Generating invitation code...')
      const inviteResult = await generateInviteCode(
        client, appId, groupId, inviteCodeValidDays, inviteCodeInviteLimit
      )
      core.setOutput('invitation-code', inviteResult.invitationCode)
      core.setOutput('invitation-code-id', inviteResult.invitationCodeId)
    } else if (generateInviteCodeFlag && !groupId) {
      core.warning('Skipping invitation code generation: no test group configured')
    }

    core.info('Upload to AGC and invite testing completed successfully!')
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

run()
