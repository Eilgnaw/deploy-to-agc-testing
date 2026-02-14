import * as core from '@actions/core'
import type { AGCClient } from './agc-client'
import type {
  CreateTestVersionRequest,
  CreateTestVersionResponse,
  AddTestPackageRequest,
  AddTestPackageResponse,
  CompileStatusResponse,
  UpdateTestVersionRequest,
  UpdateTestVersionResponse,
  SubmitTestVersionRequest,
  SubmitTestVersionResponse,
  QueryTestGroupListResponse,
  CreateTestGroupResponse,
  GenerateInviteCodeRequest,
  GenerateInviteCodeResponse,
  InviteCodeResult
} from './types'

// ============================================================
// Test Version lifecycle
// ============================================================

export async function createTestVersion(
  client: AGCClient,
  appId: string,
  opts: { releaseType: number; testType: number; testDesc: string }
): Promise<string> {
  const body: CreateTestVersionRequest = {
    releaseType: opts.releaseType,
    testType: opts.testType,
    testDesc: opts.testDesc,
    onshelfSelfDetect: 0
  }

  // Publishing API: appId in query
  const resp = await client.post<CreateTestVersionResponse>(
    '/publish/v2/test/app/version',
    body,
    undefined,
    { appId }
  )

  if (resp.ret.code !== 0) {
    throw new Error(`Failed to create test version: ${resp.ret.code} ${resp.ret.msg}`)
  }

  core.info(`Created test version: ${resp.versionId}`)
  return resp.versionId
}

export async function addTestPackage(
  client: AGCClient,
  appId: string,
  fileName: string,
  objectId: string
): Promise<string> {
  const body: AddTestPackageRequest = {
    distributeMode: 2,
    file: { fileName, objectId }
  }

  // Publishing API: appId in query
  const resp = await client.post<AddTestPackageResponse>(
    '/publish/v2/test/version/pkg',
    body,
    undefined,
    { appId }
  )

  if (resp.ret.code !== 0) {
    throw new Error(`Failed to add test package: ${resp.ret.code} ${resp.ret.msg}`)
  }

  const pkgId = resp.pkgVersion[0]
  core.info(`Added test package, pkgId: ${pkgId}`)
  return pkgId
}

const COMPILE_POLL_INTERVAL_MS = 10_000
const COMPILE_POLL_TIMEOUT_MS = 5 * 60_000

export async function pollCompileStatus(
  client: AGCClient,
  appId: string,
  pkgId: string
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < COMPILE_POLL_TIMEOUT_MS) {
    const resp = await client.get<CompileStatusResponse>(
      '/publish/v3/package/compile/status',
      { appId, pkgIds: pkgId }
    )

    if (resp.ret.code !== 0) {
      throw new Error(`Compile status check failed: ${resp.ret.code} ${resp.ret.msg}`)
    }

    const pkg = resp.pkgStateList?.[0]
    core.info(`Compile status: successStatus=${pkg?.successStatus}`)

    if (pkg && pkg.successStatus === 0) {
      core.info('Package compiled successfully')
      return
    }

    core.info(`Waiting for package compilation... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`)
    await sleep(COMPILE_POLL_INTERVAL_MS)
  }

  throw new Error('Timed out waiting for package compilation')
}

export async function updateTestVersion(
  client: AGCClient,
  appId: string,
  opts: {
    versionId: string
    pkgId: string
    groupId?: string
  }
): Promise<void> {
  const body: UpdateTestVersionRequest = {
    versionId: opts.versionId,
    pkgId: opts.pkgId
  }

  if (opts.groupId) {
    const startTime = Date.now()
    const endTime = startTime + 30 * 24 * 60 * 60 * 1000

    body.openTestInfo = {
      startTime,
      endTime,
      testTaskInfo: {
        groupInfos: [{ groupId: opts.groupId }],
        displayArea: '1'
      }
    }
  }

  const resp = await client.put<UpdateTestVersionResponse>(
    '/publish/v2/test/app/version',
    body,
    { appId }
  )

  if (resp.ret.code !== 0) {
    throw new Error(`Failed to update test version: ${resp.ret.code} ${resp.ret.msg}`)
  }

  core.info('Updated test version successfully')
}

export async function submitTestVersion(
  client: AGCClient,
  appId: string,
  versionId: string
): Promise<void> {
  const body: SubmitTestVersionRequest = { versionId }

  // Publishing API: appId in query
  const resp = await client.post<SubmitTestVersionResponse>(
    '/publish/v2/test/app/version/submit',
    body,
    undefined,
    { appId }
  )

  if (resp.ret.code !== 0) {
    throw new Error(`Failed to submit test version: ${resp.ret.code} ${resp.ret.msg}`)
  }

  core.info('Submitted test version for review')
}

// ============================================================
// Test Group
// ============================================================

export async function findOrCreateTestGroup(
  client: AGCClient,
  appId: string,
  groupName: string
): Promise<string> {
  // Query existing groups — testing API uses appId in header
  const listResp = await client.get<QueryTestGroupListResponse>(
    '/app-test/v1/test-group/list',
    undefined,
    { appId }
  )

  if (listResp.rtnCode === 0 && listResp.groups) {
    const existing = listResp.groups.find((g) => g.groupName === groupName)
    if (existing) {
      core.info(`Found existing test group: ${groupName} (${existing.groupId})`)
      return existing.groupId
    }
  }

  // Create new group
  const createResp = await client.post<CreateTestGroupResponse>(
    '/app-test/v1/test-group',
    { groupName },
    { appId }
  )

  if (createResp.rtnCode !== 0) {
    throw new Error(`Failed to create test group: ${createResp.rtnCode}`)
  }

  core.info(`Created test group: ${groupName} (${createResp.groupId})`)
  return createResp.groupId
}

// ============================================================
// Invitation Code
// ============================================================

export async function generateInviteCode(
  client: AGCClient,
  appId: string,
  groupId: string,
  validDays: number,
  inviteLimit: number
): Promise<InviteCodeResult> {
  const body: GenerateInviteCodeRequest = {
    groupId,
    invitationCodeValidDays: validDays,
    invitationCodeInviteLimit: inviteLimit
  }

  const resp = await client.post<GenerateInviteCodeResponse>(
    '/app-test/v1/invitation-code',
    body,
    { appId }
  )

  if (resp.rtnCode !== 0) {
    throw new Error(`Failed to generate invite code: ${resp.rtnCode}`)
  }

  core.info(`Generated invitation code: ${resp.invitationCode}`)
  return {
    invitationCode: resp.invitationCode,
    invitationCodeId: resp.invitationCodeId
  }
}

// ============================================================
// Helpers
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
