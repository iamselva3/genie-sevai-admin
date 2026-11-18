export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5100/api/v1').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR',
  ) {
    super(message);
  }
}

let currentToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setApiToken(token: string | null) {
  currentToken = token;
}

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function withQuery(path: string, query?: Query) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** Skip the global "signed out" redirect (used by the login forms). */
  skipAuthRedirect?: boolean;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (currentToken) headers.Authorization = `Bearer ${currentToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${withQuery(path, opts.query)}`, {
      method: opts.method || 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.', 'NETWORK');
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const err = (data as { error?: { message?: string; code?: string } } | null)?.error;
    if (res.status === 401 && !opts.skipAuthRedirect && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(res.status, err?.message || `Request failed (${res.status})`, err?.code || 'ERROR');
  }
  return data as T;
}

/** Origin of the API server (uploaded files are served from here, not from the /api/v1 base). */
export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin;
  } catch {
    return window.location.origin;
  }
})();

/** Resolves an uploaded file path such as `/uploads/ab12.webp` against the API origin. Absolute URLs pass through. */
export function assetUrl(path: string | null | undefined) {
  if (!path) return '';
  if (/^(https?:)?\/\//i.test(path) || /^(data|blob):/i.test(path)) return path;
  try {
    return new URL(path, `${API_ORIGIN}/`).toString();
  } catch {
    return path;
  }
}

interface UploadOptions {
  /** Called with 0–1 as the bytes go out. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * POST /admin/uploads. Sends the image bytes as the raw request body (not JSON) with its own
 * Content-Type and the staff token. Uses XHR so upload progress can be reported.
 */
export function uploadImage(file: Blob, opts: UploadOptions = {}): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) {
      reject(new ApiError(0, 'Upload cancelled', 'ABORTED'));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/admin/uploads`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    if (currentToken) xhr.setRequestHeader('Authorization', `Bearer ${currentToken}`);
    if (opts.onProgress) {
      const report = opts.onProgress;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) report(Math.min(1, e.loaded / e.total));
      };
    }
    const onAbort = () => xhr.abort();
    opts.signal?.addEventListener('abort', onAbort, { once: true });
    const done = () => opts.signal?.removeEventListener('abort', onAbort);

    xhr.onload = () => {
      done();
      let data: unknown = null;
      if (xhr.responseText) {
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = null;
        }
      }
      const url = (data as { url?: unknown } | null)?.url;
      if (xhr.status >= 200 && xhr.status < 300 && typeof url === 'string' && url) {
        resolve({ url });
        return;
      }
      const err = (data as { error?: { message?: string; code?: string } } | null)?.error;
      if (xhr.status === 401 && unauthorizedHandler) unauthorizedHandler();
      reject(new ApiError(xhr.status, err?.message || `Upload failed (${xhr.status})`, err?.code || 'ERROR'));
    };
    xhr.onerror = () => {
      done();
      reject(new ApiError(0, 'Cannot reach the server. Check your connection and try again.', 'NETWORK'));
    };
    xhr.onabort = () => {
      done();
      reject(new ApiError(0, 'Upload cancelled', 'ABORTED'));
    };
    xhr.send(file);
  });
}

export function errorMessage(err: unknown, fallback = 'Something went wrong') {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
