/**
 * VoyageAI — Centralized API & WebSocket Configuration
 * 
 * TO UPDATE YOUR BACKEND / NGROK URL IN THE FUTURE:
 * Simply update `DEFAULT_BACKEND_URL` below or edit `VITE_API_URL` in `.env` / `.env.production`.
 */

export const DEFAULT_BACKEND_URL = 'https://3e2c-2401-4900-8927-d7dc-55d7-788c-2c5f-c63d.ngrok-free.app';

/**
 * Returns the active HTTP/HTTPS API base URL.
 * Order of precedence:
 * 1. Environment variable (VITE_API_URL or VITE_API_BASE_URL)
 * 2. Localhost fallback (if running locally on browser)
 * 3. DEFAULT_BACKEND_URL
 */
export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/$/, '');
  }

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocalhost) {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${window.location.hostname}:8000`;
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
 * Returns HTTP headers enriched with Bearer Authorization token if logged in.
 */
export const getAuthHeaders = (): Record<string, string> => {
  const headers = { ...DEFAULT_HEADERS };
  try {
    const sessionRaw = localStorage.getItem('voyageai_session_data');
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }
    }
  } catch {
    /* fallback silently */
  }
  return headers;
};
