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
    pkgVersion: string[];
}
export interface PackageState {
    pkgId: string;
    successStatus: number;
}
export interface CompileStatusResponse {
    ret: ConnectRet;
    pkgStateList: PackageState[];
}
export interface GroupInfoItem {
    groupId: string;
}
export interface TestTaskInfo {
    groupInfos: GroupInfoItem[];
    displayArea?: string;
    needShareLink?: number;
    needNotify?: number;
}
export interface OpenTestInfo {
    startTime?: number;
    endTime?: number;
    testDesc?: string;
    testTaskInfo?: TestTaskInfo;
}
export interface AppLanguage {
    language: string;
    newFeatures: string;
}
export interface UpdateTestVersionRequest {
    versionId: string;
    pkgId: string;
    languages?: AppLanguage[];
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
    addedTestersNum?: number;
}
export interface QueryTestGroupListResponse {
    rtnCode: number;
    groups: SimpleGroupInfo[];
}
export interface CreateTestGroupResponse {
    rtnCode: number;
    groupId: string;
}
export interface GenerateInviteCodeRequest {
    groupId: string;
    invitationCodeValidDays: number;
    invitationCodeInviteLimit: number;
}
export interface GenerateInviteCodeResponse {
    rtnCode: number;
    invitationCode: string;
    invitationCodeId: string;
}
export interface InviteCodeResult {
    invitationCode: string;
    invitationCodeId: string;
}
export interface CategoryInfo {
    category: string;
}
export interface DetectionExtendField {
    testAccount?: string;
    testAccountPassword?: string;
}
export interface CreateDetectionTaskRequest {
    appId: string;
    objectId: string;
    fileName: string;
    source: string;
    categories?: CategoryInfo[];
    extendField?: DetectionExtendField;
}
export interface CreateDetectionTaskResponse {
    ret: ConnectRet;
    taskId: string;
}
export interface DetectionTaskReportResponse {
    ret: ConnectRet;
    taskId: string;
    status: string;
    result?: string;
    appId: string;
    reportUrl?: string;
    reportDownloadUrl?: string;
    createTime: string;
    endTime?: string;
}
export interface ServiceAccountCredentials {
    project_id: string;
    key_id: string;
    private_key: string;
    sub_account: string;
    token_uri: string;
    auth_uri: string;
    auth_provider_cert_uri: string;
    client_cert_uri: string;
}
