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
import * as path from 'path'
import * as fs from 'fs'

// ============================================================
// 使用方法:
//   npx ts-node src/test-local.ts \
//     --client-id YOUR_CLIENT_ID \
//     --client-secret YOUR_CLIENT_SECRET \
//     --app-id YOUR_APP_ID \
//     --app-path /path/to/entry-default-signed.hap \
//     [--test-group-name "TestGroup"] \
//     [--generate-invite-code] \
//     [--what-to-test-dir ./APPTest] \
//     [--language zh-Hans]
// ============================================================

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {}
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].substring(2)
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args[key] = argv[i + 1]
        i++
      } else {
        args[key] = 'true'
      }
    }
  }
  return args
}

async function main() {
  const args = parseArgs()

  const clientId = args['client-id']
  const clientSecret = args['client-secret']
  const appId = args['app-id']
  const appPath = args['app-path']

  if (!clientId || !clientSecret || !appId || !appPath) {
    console.error('Missing required arguments: --client-id, --client-secret, --app-id, --app-path')
    process.exit(1)
  }

  const resolvedAppPath = path.resolve(appPath)
  if (!fs.existsSync(resolvedAppPath)) {
    console.error(`File not found: ${resolvedAppPath}`)
    process.exit(1)
  }

  const testGroupName = args['test-group-name'] || ''
  const genInviteCode = args['generate-invite-code'] === 'true'
  const whatToTestDir = args['what-to-test-dir'] || 'APPTest'
  const language = args['language'] || 'zh-Hans'
  const releaseType = 6
  const testType = 3

  // 1. Read WhatToTest
  console.log('--- Reading WhatToTest ---')
  const whatToTest = await readWhatToTest(whatToTestDir, language)
  const testDesc = args['test-desc'] || truncateTestDesc(whatToTest.content) || '测试版本'
  console.log(`testDesc: ${testDesc}`)

  // 2. Authenticate
  console.log('\n--- Authenticating ---')
  const client = new AGCClient()
  await client.authenticate(clientId, clientSecret)

  // 3. File info
  const fileName = path.basename(resolvedAppPath)
  const fileStats = fs.statSync(resolvedAppPath)
  console.log(`\n--- File: ${fileName}, size: ${fileStats.size} bytes ---`)

  const sha256 = await computeFileSha256(resolvedAppPath)
  console.log(`SHA256: ${sha256}`)

  // 4. Get upload URL
  console.log('\n--- Getting upload URL ---')
  const uploadUrlResp = await getUploadUrl(client, appId, fileName, fileStats.size, sha256, releaseType)
  console.log(`objectId: ${uploadUrlResp.urlInfo.objectId}`)

  // 5. Upload file
  console.log('\n--- Uploading file ---')
  await uploadFile(uploadUrlResp.urlInfo, resolvedAppPath)

  // 6. Create test version
  console.log('\n--- Creating test version ---')
  const versionId = await createTestVersion(client, appId, { releaseType, testType, testDesc })
  console.log(`versionId: ${versionId}`)

  // 7. Add test package
  console.log('\n--- Adding test package ---')
  const pkgId = await addTestPackage(client, appId, fileName, uploadUrlResp.urlInfo.objectId)
  console.log(`pkgId: ${pkgId}`)

  // 8. Poll compile status
  console.log('\n--- Polling compile status ---')
  await pollCompileStatus(client, appId, pkgId)

  // 9. Find or create test group
  let groupId: string | undefined
  if (testGroupName) {
    console.log(`\n--- Finding/creating test group: ${testGroupName} ---`)
    groupId = await findOrCreateTestGroup(client, appId, testGroupName)
    console.log(`groupId: ${groupId}`)
  }

  // 10. Update test version
  console.log('\n--- Updating test version ---')
  await updateTestVersion(client, appId, { versionId, pkgId, groupId })

  // 11. Submit test version
  console.log('\n--- Submitting test version ---')
  await submitTestVersion(client, appId, versionId)

  // 12. Generate invite code
  if (genInviteCode && groupId) {
    console.log('\n--- Generating invite code ---')
    const result = await generateInviteCode(client, appId, groupId, 7, 1000)
    console.log(`invitationCode: ${result.invitationCode}`)
    console.log(`invitationCodeId: ${result.invitationCodeId}`)
  }

  console.log('\n=== Done ===')
  console.log(`version-id: ${versionId}`)
  console.log(`pkg-version: ${pkgId}`)
  if (groupId) console.log(`group-id: ${groupId}`)
}

main().catch((err) => {
  console.error('Failed:', err.message || err)
  process.exit(1)
})
