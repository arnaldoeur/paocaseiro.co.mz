import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.css';

// Service Worker registration removed to prevent infinite reload loop with selfDestroying config


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
