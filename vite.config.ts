import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        compression({
          algorithm: 'brotliCompress',
          ext: '.br',
          threshold: 1024,
          compressionOptions: { level: 11 }
        }),
        compression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 1024
        }),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.svg', 'robots.txt'],
          workbox: {
            navigateFallback: '/index.html',
            runtimeCaching: [
              {
                urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style' || request.destination === 'worker',
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'static-resources',
                  expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }
                }
              },
              {
                urlPattern: ({ request }) => request.destination === 'image' || request.destination === 'font',
                handler: 'CacheFirst',
                options: {
                  cacheName: 'assets',
                  expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }
                }
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        minify: 'esbuild',
        assetsInlineLimit: 4096,
        cssCodeSplit: true,
        rollupOptions: {
          output: {
            manualChunks: {
              three: ['three'],
              r3f: ['@react-three/fiber', '@react-three/drei']
            }
          }
        }
      }
    };
});
