import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// ==============================================
// 🔄 AUTO‑UPDATE NOTIFIER — ALL SCHOOLS GET NEW VERSION
// ==============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Update system active');

        // Check for new version & notify users
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Ask user to refresh for new features
                if (confirm("✅ New Update Available! Click OK to refresh and get latest features.")) {
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


