// ============================================================
// AGC API Response wrapper
// ============================================================
export interface ConnectRet {
  code: number
  msg: string
}

// ============================================================
// OAuth Token
// ============================================================
export interface TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

// ============================================================
// Upload URL (OBS)
// ============================================================
export interface UploadUrlResponse {
  ret: ConnectRet
  urlInfo: CommonUrlInfo
}

export interface CommonUrlInfo {
  url: string
  method: string
  headers: Record<string, string>
  objectId: string
}

// ============================================================
// Test Version
// ============================================================
export interface CreateTestVersionRequest {
  releaseType: number
  testType: number
  testDesc: string
  onshelfSelfDetect?: number
}

export interface CreateTestVersionResponse {
  ret: ConnectRet
  versionId: string
}

// ============================================================
// Test Package
// ============================================================
export interface FileInfo {
  fileName: string
  objectId: string
}

export interface AddTestPackageRequest {
  distributeMode: number
  file: FileInfo
}

export interface AddTestPackageResponse {
  ret: ConnectRet
  pkgVersion: string[]
}

// ============================================================
// Compile Status (v3)
// ============================================================
export interface PackageState {
  pkgId: string
  successStatus: number
}

export interface CompileStatusResponse {
  ret: ConnectRet
  pkgStateList: PackageState[]
}

// ============================================================
// Update Test Version
// ============================================================
export interface GroupInfoItem {
  groupId: string
}

export interface TestTaskInfo {
  groupInfos: GroupInfoItem[]
  displayArea?: string
  needShareLink?: number
  needNotify?: number
}

export interface OpenTestInfo {
  startTime: number
  endTime: number
  testTaskInfo: TestTaskInfo
}

export interface UpdateTestVersionRequest {
  versionId: string
  pkgId: string
  openTestInfo?: OpenTestInfo
}

export interface UpdateTestVersionResponse {
  ret: ConnectRet
}

// ============================================================
// Submit Test Version
// ============================================================
export interface SubmitTestVersionRequest {
  versionId: string
}

export interface SubmitTestVersionResponse {
  ret: ConnectRet
}

// ============================================================
// Test Group
// Note: Testing API (/app-test/v1/) uses rtnCode at top level,
// NOT the ret: { code, msg } wrapper used by Publishing API.
// ============================================================
export interface SimpleGroupInfo {
  groupId: string
  groupName: string
  addedTestersNum?: number
}

export interface QueryTestGroupListResponse {
  rtnCode: number
  groups: SimpleGroupInfo[]
}

export interface CreateTestGroupResponse {
  rtnCode: number
  groupId: string
}

// ============================================================
// Invitation Code
// ============================================================
export interface GenerateInviteCodeRequest {
  groupId: string
  invitationCodeValidDays: number
  invitationCodeInviteLimit: number
}

export interface GenerateInviteCodeResponse {
  rtnCode: number
  invitationCode: string
  invitationCodeId: string
}

export interface InviteCodeResult {
  invitationCode: string
  invitationCodeId: string
}
