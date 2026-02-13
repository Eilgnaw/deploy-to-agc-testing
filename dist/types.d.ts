export interface ConnectRet {
    code: number;
    msg: string;
}
export interface TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}
export interface UploadUrlResponse {
    ret: ConnectRet;
    urlInfo: CommonUrlInfo;
}
export interface CommonUrlInfo {
    url: string;
    method: string;
    headers: Record<string, string>;
    objectId: string;
}
export interface CreateTestVersionRequest {
    releaseType: number;
    testType: number;
    testDesc: string;
    onshelfSelfDetect?: number;
}
export interface CreateTestVersionResponse {
    ret: ConnectRet;
    versionId: string;
}
export interface FileInfo {
    fileName: string;
    objectId: string;
}
export interface AddTestPackageRequest {
    distributeMode: number;
    file: FileInfo;
}
export interface AddTestPackageResponse {
    ret: ConnectRet;
    pkgVersion: string;
}
export interface CompileStatusResponse {
    ret: ConnectRet;
    successStatus: number;
    pkgId: string;
}
export interface GroupInfoItem {
    groupId: string;
}
export interface TestTaskInfo {
    groupInfos: GroupInfoItem[];
}
export interface OpenTestInfo {
    testTaskInfo: TestTaskInfo;
}
export interface UpdateTestVersionRequest {
    versionId: string;
    pkgId: string;
    openTestInfo?: OpenTestInfo;
}
export interface UpdateTestVersionResponse {
    ret: ConnectRet;
}
export interface SubmitTestVersionRequest {
    versionId: string;
}
export interface SubmitTestVersionResponse {
    ret: ConnectRet;
}
export interface SimpleGroupInfo {
    groupId: string;
    groupName: string;
}
export interface QueryTestGroupListResponse {
    ret: ConnectRet;
    list: SimpleGroupInfo[];
    total: number;
}
export interface CreateTestGroupResponse {
    ret: ConnectRet;
    groupId: string;
}
export interface GenerateInviteCodeRequest {
    groupId: string;
    invitationCodeValidDays: number;
    invitationCodeInviteLimit: number;
}
export interface GenerateInviteCodeResponse {
    ret: ConnectRet;
    invitationCode: string;
    invitationCodeId: string;
}
export interface InviteCodeResult {
    invitationCode: string;
    invitationCodeId: string;
}
