export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

export function getApiUrl(endpoint: string): string {
  if (!endpoint) return API_BASE_URL;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}

export async function safeJson<T = any>(res: Response, fallback: T | null = null): Promise<T | null> {
  if (!res) return fallback;
  try {
    const text = await res.text();
    if (!text) return fallback;
    const trimmed = text.trim();
    if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
      return fallback;
    }
    return JSON.parse(text) as T;
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


