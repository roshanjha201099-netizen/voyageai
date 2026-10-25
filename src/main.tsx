import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ReduxProvider } from './store';
import './styles/index.css';
import App from './App.tsx';

// Strictly enforce zero localStorage / sessionStorage policy: wipe legacy browser storage
if (typeof window !== 'undefined') {
  try {
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  } catch {
    /* ignore */
  }

  // Ensure all outbound requests to ngrok bypass the warning page automatically
  if (window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (urlStr && urlStr.includes('ngrok')) {
        const headers = new Headers(
          init?.headers || (typeof input === 'object' && 'headers' in input ? (input.headers as HeadersInit) : undefined)
        );
        if (!headers.has('ngrok-skip-browser-warning')) {
          headers.set('ngrok-skip-browser-warning', 'true');
        }
        return originalFetch(input, { ...init, headers });
      }
      return originalFetch(input, init);
    };
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReduxProvider>
      <App />
    </ReduxProvider>
  </StrictMode>,
);
