export declare class AGCClient {
    private token;
    private clientId;
    authenticate(clientId: string, clientSecret: string): Promise<void>;
    get<T>(path: string, query?: Record<string, string>, extraHeaders?: Record<string, string>): Promise<T>;
    post<T>(path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T>;
    put<T>(path: string, body?: unknown, query?: Record<string, string>, extraHeaders?: Record<string, string>): Promise<T>;
    private defaultHeaders;
    private rawRequest;
}
