export interface WhatToTestResult {
    locale: string;
    content: string;
}
export declare function readWhatToTest(dir: string, language: string): Promise<WhatToTestResult>;
export declare function truncateTestDesc(content: string, maxLength?: number): string;
