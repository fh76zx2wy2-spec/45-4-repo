import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './components/ui';
import { readThemePref, applyTheme } from './lib/theme';
import { unlockAudio } from './lib/feedback';
import { initInstallPrompt } from './lib/pwa';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';

applyTheme(readThemePref());
initInstallPrompt();
window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
