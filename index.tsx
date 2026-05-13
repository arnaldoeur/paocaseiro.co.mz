import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.css';
import { authService } from './services/authService';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Root element not found");
} else {
  // Manual Google Auth Handler (Redirect Mode)
  const handleGoogleAuth = async () => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      
      // Clear hash immediately for security
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      
      if (accessToken) {
        try {
          const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const userInfo = await response.json();
          
          if (userInfo.email) {
            await authService.signInWithGoogle(
              userInfo.email,
              userInfo.name || '',
              userInfo.picture || ''
            );
            
            // Success event for app sync
            window.dispatchEvent(new CustomEvent('pc_user_update'));
            
            if (localStorage.getItem('google_login_pending')) {
              localStorage.removeItem('google_login_pending');
              window.location.href = '/dashboard';
            }
          }
        } catch (err) {
          console.error("[Auth] Google Redirect error:", err);
        }
      }
    }
  };

  handleGoogleAuth();

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <App />
  );
}
