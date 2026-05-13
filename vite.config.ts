import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const proxyConfig = {};

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      proxy: {
        '/paocaseiro_db.php': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false
        }
      },
      allowedHosts: true
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      proxy: {
        '/paocaseiro_db.php': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false
        }
      },
      allowedHosts: true
    },
    plugins: [
      tailwindcss(),
      react(),
      VitePWA({
        selfDestroying: true,
        registerType: 'autoUpdate',
        includeAssets: ['robots.txt', 'assets/ui/logo.png'],
        manifest: {
          name: 'Pão Caseiro - O sabor que aquece o coração',
          short_name: 'Pão Caseiro',
          description: 'Padaria Pão Caseiro em Lichinga. Peça já!',
          theme_color: '#3b2f2f',
          background_color: '#f7f1eb',
          display: 'standalone',
          icons: [
            {
              src: '/assets/ui/logo.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/assets/ui/logo.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
          maximumFileSizeToCacheInBytes: 5242880, // 5 MiB
          runtimeCaching: []
        }
      })
    ],
    define: {
      'process.env.VITE_SUPABASE_URL': '""',
      'process.env.VITE_SUPABASE_ANON_KEY': '""',
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
