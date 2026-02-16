import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  console.log('Supabase URL:', env.VITE_SUPABASE_URL);
  console.log('Supabase Key:', env.VITE_SUPABASE_ANON_KEY);
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/paysuite': {
          target: 'https://paysuite.tech',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/paysuite/, '/api/v1/payments'),
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, _req, _res) => {
              proxyReq.setHeader('User-Agent', 'PaoCaseiro/1.0');
              proxyReq.setHeader('Referer', 'https://paysuite.co.mz');
              proxyReq.setHeader('Origin', 'https://paysuite.co.mz');
              proxyReq.setHeader('Accept', 'application/json');
              proxyReq.setHeader('X-Requested-With', 'XMLHttpRequest');
            });
          }
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    base: './'
  };
});
