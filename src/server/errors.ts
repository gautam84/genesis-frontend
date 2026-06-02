/**
 * Thrown when the request never reached the server (DNS, offline, CORS preflight,
 * backend mid-restart). Callers must NOT treat this as an auth failure: the token
 * is still valid, the network just blinked. Distinguished from auth/validation
 * errors which arrive as a regular Error with the server's message.
 */
export class NetworkError extends Error {
    readonly url: string;
    constructor(url: string, cause?: unknown) {
        super(`Cannot reach server at ${url}`);
        this.name = 'NetworkError';
        this.url = url;
        if (cause instanceof Error && cause.stack) this.stack = cause.stack;
    }
}

export class SessionExpiredError extends Error {
    constructor() {
        super('Session expired. Please login again.');
        this.name = 'SessionExpiredError';
    }
}
