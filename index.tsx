import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA
registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Root element not found");
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
