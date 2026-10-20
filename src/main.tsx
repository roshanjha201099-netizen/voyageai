import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ReduxProvider } from './store';
import './styles/index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReduxProvider>
      <App />
    </ReduxProvider>
  </StrictMode>,
);
