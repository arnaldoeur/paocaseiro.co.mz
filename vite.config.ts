import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const proxyConfig = {
    '/supabase-proxy': {
      target: env.VITE_SUPABASE_URL || 'https://bqiegszufcqimlvucrpm.supabase.co',
      changeOrigin: true,
      ws: true,
      rewrite: (path: string) => path.replace(/^\/supabase-proxy/, ''),
      secure: false,
      configure: (proxy: any, _options: any) => {
        proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
          const targetUrl = env.VITE_SUPABASE_URL || 'https://bqiegszufcqimlvucrpm.supabase.co';
          proxyReq.setHeader('Origin', targetUrl);
          proxyReq.setHeader('Referer', targetUrl);
          
          if (!req.headers['accept']) {
              proxyReq.setHeader('Accept', 'application/json');
          }

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
        proxy.on('proxyRes', (proxyRes: any, req: any, res: any) => {
          // Force CORS headers on the response to prevent browser blocks
          proxyRes.headers['access-control-allow-origin'] = '*';
          proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
          proxyRes.headers['access-control-allow-headers'] = 'X-Requested-With, content-type, Authorization, apikey, x-client-info, Prefer, Accept';
          
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
      proxy: proxyConfig,
      allowedHosts: true
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      proxy: proxyConfig,
      allowedHosts: true
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'images/**/*.png', 'images/**/*.jpg'],
        manifest: {
          name: 'Pão Caseiro - O sabor que aquece o coração',
          short_name: 'Pão Caseiro',
          description: 'Padaria Pão Caseiro em Lichinga. Peça já!',
          theme_color: '#3b2f2f',
          background_color: '#f7f1eb',
          display: 'standalone',
          icons: [
            {
              src: '/pao_caseiro_hero.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pao_caseiro_hero.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          maximumFileSizeToCacheInBytes: 5242880, // 5 MiB
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/bqiegszufcqimlvucrpm\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      outDir: 'dist',
      minify: 'esbuild',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            charts: ['echarts', 'echarts-for-react'],
            maps: ['leaflet', 'react-leaflet'],
            ui: ['framer-motion', 'lucide-react']
          }
        }
      }
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : []
    },
    base: '/'
  };
});
