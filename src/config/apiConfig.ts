/**
 * VoyageAI — Centralized API & WebSocket Configuration
 * 
 * TO UPDATE YOUR BACKEND / NGROK URL IN THE FUTURE:
 * Simply update `DEFAULT_BACKEND_URL` below or edit `VITE_API_URL` in `.env` / `.env.production`.
 */

export const DEFAULT_BACKEND_URL = 'http://localhost:8000';

/**
 * Returns the active HTTP/HTTPS API base URL.
 * Order of precedence:
 * 1. Environment variable (VITE_API_URL or VITE_API_BASE_URL)
 * 2. DEFAULT_BACKEND_URL
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, '');
  }

  return DEFAULT_BACKEND_URL.replace(/\/$/, '');
};

/**
 * Returns the WebSocket URL (ws:// or wss://) for any given endpoint path.
 * Automatically appends ?ngrok-skip-browser-warning=true when connecting to ngrok.
 */
export const getWsBaseUrl = (endpointPath: string = '/ws/app'): string => {
  const envWsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_WS_BASE_URL;
  let baseWs = '';

  if (envWsUrl && envWsUrl.trim().length > 0) {
    baseWs = envWsUrl.trim().replace(/\/ws\/?$/, '').replace(/\/$/, '');
  } else {
    const apiBase = getApiBaseUrl();
    baseWs = apiBase.replace(/^http/, 'ws').replace(/\/ws\/?$/, '').replace(/\/$/, '');
  }

  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  let fullWsUrl = baseWs.endsWith(cleanPath) ? baseWs : `${baseWs}${cleanPath}`;

  if (fullWsUrl.includes('ngrok') && !fullWsUrl.includes('ngrok-skip-browser-warning')) {
    const separator = fullWsUrl.includes('?') ? '&' : '?';
    fullWsUrl = `${fullWsUrl}${separator}ngrok-skip-browser-warning=true`;
  }

  return fullWsUrl;
};

/**
 * Default HTTP headers for fetch requests.
 */
export const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

/**
 * Returns HTTP headers for authenticated requests.
 * User identity is bound to the voyageai_session HttpOnly cookie (credentials: 'include')
 * with Bearer Authorization header as an auxiliary layer for cross-site environments.
 */
export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  try {
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('voyageai_token');
      if (!token) {
        const raw = localStorage.getItem('voyageai_session_data');
        if (raw) {
          const data = JSON.parse(raw);
          token = data?.token || null;
        }
      }
      if (!token) {
        token = sessionStorage.getItem('voyageai_token');
      }
    }
    if (token && token.trim().length > 0) {
      const cleanToken = token.trim();
      headers['Authorization'] = `Bearer ${cleanToken}`;
      headers['X-Auth-Token'] = cleanToken;
    }
  } catch {
    /* fallback silently */
  }
  return headers;
};

/**
 * Standard fetch options with credentials: 'include' for HttpOnly cookie session handling,
 * and dynamic headers evaluation ensuring Bearer tokens & ngrok bypass headers are attached.
 */
export const DEFAULT_FETCH_OPTIONS: RequestInit = {
  credentials: 'include',
  get headers() {
    return getAuthHeaders();
  },
};

/**
 * Helper to get fresh fetch options with auth headers.
 */
export const getDefaultFetchOptions = (): RequestInit => ({
  credentials: 'include',
  headers: getAuthHeaders(),
});

