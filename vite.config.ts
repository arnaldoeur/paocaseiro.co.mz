import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  console.log('Supabase URL:', env.VITE_SUPABASE_URL);
  console.log('Supabase Key:', env.VITE_SUPABASE_ANON_KEY);
  const proxyConfig = {
    '/api/paysuite': {
      target: 'https://paysuite.tech',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/paysuite/, '/api/v1/payments'),
      secure: false,
      configure: (proxy: any, _options: any) => {
        proxy.on('proxyReq', (proxyReq: any, _req: any, _res: any) => {
          proxyReq.setHeader('User-Agent', 'PaoCaseiro/1.0');
          proxyReq.setHeader('Referer', 'https://paocaseiro.co.mz');
          proxyReq.setHeader('Origin', 'https://paocaseiro.co.mz');
          proxyReq.setHeader('Accept', 'application/json');
          proxyReq.setHeader('X-Requested-With', 'XMLHttpRequest');
        });
      }
    },
    '/api/resend': {
      target: 'https://api.resend.com',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/resend/, ''),
      secure: false,
      configure: (proxy: any, _options: any) => {
        proxy.on('proxyReq', (proxyReq: any, _req: any, _res: any) => {
          proxyReq.setHeader('Accept', 'application/json');
        });
      }
    },
    '/api/turbo': {
      target: 'https://my.turbo.host',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/turbo/, '/api/international-sms'),
      secure: false,
      configure: (proxy: any, _options: any) => {
        proxy.on('proxyReq', (proxyReq: any, _req: any, _res: any) => {
          proxyReq.setHeader('Origin', 'https://my.turbo.host');
          proxyReq.setHeader('Referer', 'https://my.turbo.host');
        });
      }
    },
    '/supabase-proxy': {
      target: env.VITE_SUPABASE_URL || 'https://bqiegszufcqimlvucrpm.supabase.co',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/supabase-proxy/, ''),
      secure: false,
      configure: (proxy: any, _options: any) => {
        proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
          const targetUrl = env.VITE_SUPABASE_URL || 'https://bqiegszufcqimlvucrpm.supabase.co';
          proxyReq.setHeader('Origin', targetUrl);
          proxyReq.setHeader('Referer', targetUrl);
          proxyReq.setHeader('Accept', 'application/json');

          if (req.headers['authorization']) {
            proxyReq.setHeader('Authorization', req.headers['authorization']);
          }
          if (req.headers['apikey']) {
            proxyReq.setHeader('apikey', req.headers['apikey']);
          }
        });
        proxy.on('error', (err: any, _req: any, _res: any) => {
          console.error('[Supabase Proxy ERROR]', err.message);
        });
        proxy.on('proxyRes', (proxyRes: any, req: any, _res: any) => {
          if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
            console.log(`[Supabase Proxy Status] ${req.url} -> ${proxyRes.statusCode}`);
          }
        });
      }
    }
  };

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: proxyConfig
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      proxy: proxyConfig
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
