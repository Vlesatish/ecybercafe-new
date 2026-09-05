export const API_BASE_URL = (() => {
  const raw = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
  if (typeof window !== 'undefined' && raw) {
    try {
      const parsedUrl = new URL(raw, window.location.href);
      if (parsedUrl.origin !== window.location.origin) {
        return '';
      }
    } catch (e) {
      return '';
    }
  }
  return raw;
})();

export function getApiUrl(endpoint: string): string {
  if (!endpoint) return API_BASE_URL;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
}

// Global fetch patch to guarantee all /api and /uploads calls automatically route through VITE_API_URL and carry session token headers
if (typeof window !== 'undefined' && !(window as any)._fetchPatched) {
  (window as any)._fetchPatched = true;
  try {
    const origFetch = window.fetch;
    const customFetch = function (this: any, input: RequestInfo | URL, init?: RequestInit) {
      let finalInput = input;
      let urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;

      if (typeof input === 'string') {
        if (input.startsWith('/api') || input.startsWith('/uploads')) {
          finalInput = getApiUrl(input);
        }
      } else if (input instanceof URL) {
        if (input.pathname.startsWith('/api') || input.pathname.startsWith('/uploads')) {
          finalInput = getApiUrl(input.pathname + input.search);
        }
      } else if (typeof Request !== 'undefined' && input instanceof Request) {
        const urlObj = new URL(input.url, window.location.href);
        if (urlObj.pathname.startsWith('/api') || urlObj.pathname.startsWith('/uploads')) {
          const targetUrl = getApiUrl(urlObj.pathname + urlObj.search);
          finalInput = new Request(targetUrl, input);
        }
      }

      // Automatically attach Session Token from localStorage if present
      let token: string | null = null;
      try {
        token = localStorage.getItem('ecyber_session_token');
      } catch (e) {}

      if (token && urlString.includes('/api/')) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        if (!headers.has('X-Session-Token')) {
          headers.set('X-Session-Token', token);
        }
        init.headers = headers;
      }

      return origFetch.call(window, finalInput, init);
    };

    try {
      (window as any).fetch = customFetch;
    } catch (e) {
      try {
        Object.defineProperty(window, 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true,
        });
      } catch (e2) {
        try {
          Object.defineProperty(Object.getPrototypeOf(window), 'fetch', {
            value: customFetch,
            writable: true,
            configurable: true,
          });
        } catch (e3) {
          console.warn('Could not override window.fetch:', e3);
        }
      }
    }
  } catch (err) {
    console.warn('Error patching fetch:', err);
  }
}

// Global Response.prototype.json patch to prevent "Unexpected token '<', '<html> <h'... is not valid JSON" errors
if (typeof window !== 'undefined' && typeof Response !== 'undefined' && Response.prototype && !(Response.prototype as any)._jsonPatched) {
  (Response.prototype as any)._jsonPatched = true;

  Response.prototype.json = async function () {
    try {
      if ((this as any)._cachedParsedJson !== undefined) {
        return (this as any)._cachedParsedJson;
      }
      let text = '';
      if ((this as any)._cachedText !== undefined) {
        text = (this as any)._cachedText;
      } else {
        text = await this.text();
        (this as any)._cachedText = text;
      }
      if (!text) {
        const emptyObj = {};
        (this as any)._cachedParsedJson = emptyObj;
        return emptyObj;
      }
      const trimmed = text.trim();
      const httpStatus = (this as any).status || 200;

      if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
        console.warn('Response is HTML instead of JSON:', trimmed.slice(0, 150));
        let errorMessage = `Server endpoint returned an invalid response (Status ${httpStatus}). Please try again.`;
        if (httpStatus === 413 || trimmed.toLowerCase().includes('413') || trimmed.toLowerCase().includes('too large')) {
          errorMessage = 'File or request payload is too large. Please compress images or upload smaller files.';
        } else if (httpStatus === 404) {
          errorMessage = 'Requested API endpoint was not found on server.';
        } else if (httpStatus >= 500) {
          errorMessage = 'Server encountered an internal error. Please try again.';
        }

        const htmlErr = {
          error: errorMessage,
          message: errorMessage,
          isHtmlResponse: true,
          status: httpStatus,
          htmlSnippet: trimmed.slice(0, 200)
        };
        (this as any)._cachedParsedJson = htmlErr;
        return htmlErr;
      }
      const parsed = JSON.parse(text);
      (this as any)._cachedParsedJson = parsed;
      return parsed;
    } catch (err: any) {
      console.warn('Failed to parse JSON response:', err);
      const parseErr = {
        error: 'Invalid JSON response from server.',
        details: err?.message || String(err)
      };
      (this as any)._cachedParsedJson = parseErr;
      return parseErr;
    }
  };
}

export async function safeJson<T = any>(res: Response, fallback: T | null = null): Promise<T | null> {
  if (!res) return fallback;
  try {
    const data = await res.json();
    if (data && data.isHtmlResponse) {
      return fallback;
    }
    return data as T;
  } catch (err) {
    return fallback;
  }
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback: T | null = null
): Promise<T | null> {
  try {
    const url = typeof input === 'string' ? getApiUrl(input) : input;
    const res = await fetch(url, init);
    if (!res.ok) {
      return fallback;
    }
    return await safeJson<T>(res, fallback);
  } catch (err) {
    return fallback;
  }
}


