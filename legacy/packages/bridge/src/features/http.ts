import type { AuthSession } from './session';

/**
 * Framework-agnostic HTTP interception.
 *
 * The same interceptor chain backs the React remote's fetch client and the
 * Angular remote's `HttpInterceptorFn` adapter, so auth enrichment is
 * defined exactly once, next to the session contract.
 */
export interface BridgeRequest {
  url: string;
  init: RequestInit;
}

export type HttpRequestInterceptor = (request: BridgeRequest) => Promise<BridgeRequest> | BridgeRequest;

/** Adds authorization headers from the host-owned session. */
export function createAuthInterceptor(session: AuthSession): HttpRequestInterceptor {
  return async ({ url, init }) => ({ url, init: await session.authorizeRequest(init) });
}

/** Tags requests with the calling MFE, for tracing across the federation. */
export function createOriginInterceptor(appName: string): HttpRequestInterceptor {
  return ({ url, init }) => {
    const headers = new Headers(init.headers);
    headers.set('X-Remote-App', appName);
    return { url, init: { ...init, headers } };
  };
}

export interface HttpClientOptions {
  interceptors?: HttpRequestInterceptor[];
  /** Swap the transport (tests, mock APIs). Defaults to global fetch. */
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
}

export type HttpClient = (url: string, init?: RequestInit) => Promise<Response>;

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const { interceptors = [], fetchImpl = (url, init) => fetch(url, init) } = options;
  return async (url, init = {}) => {
    let request: BridgeRequest = { url, init };
    for (const interceptor of interceptors) {
      request = await interceptor(request);
    }
    return fetchImpl(request.url, request.init);
  };
}
