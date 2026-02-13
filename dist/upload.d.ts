import type { AGCClient } from './agc-client';
import type { UploadUrlResponse, CommonUrlInfo } from './types';
export declare function computeFileSha256(filePath: string): Promise<string>;
export declare function getUploadUrl(client: AGCClient, appId: string, fileName: string, contentLength: number, sha256: string, releaseType: number): Promise<UploadUrlResponse>;
export declare function uploadFile(urlInfo: CommonUrlInfo, filePath: string): Promise<void>;
