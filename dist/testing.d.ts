import type { AGCClient } from './agc-client';
import type { InviteCodeResult } from './types';
export declare function createTestVersion(client: AGCClient, appId: string, opts: {
    releaseType: number;
    testType: number;
    testDesc: string;
}): Promise<string>;
export declare function addTestPackage(client: AGCClient, appId: string, fileName: string, objectId: string): Promise<string>;
export declare function pollCompileStatus(client: AGCClient, appId: string, pkgId: string): Promise<void>;
export declare function updateTestVersion(client: AGCClient, appId: string, opts: {
    versionId: string;
    pkgId: string;
    groupId?: string;
}): Promise<void>;
export declare function submitTestVersion(client: AGCClient, appId: string, versionId: string): Promise<void>;
export declare function findOrCreateTestGroup(client: AGCClient, appId: string, groupName: string): Promise<string>;
export declare function generateInviteCode(client: AGCClient, appId: string, groupId: string, validDays: number, inviteLimit: number): Promise<InviteCodeResult>;
