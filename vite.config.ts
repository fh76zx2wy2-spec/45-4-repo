/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'fonts/*.woff2'],
      manifest: {
        id: '/',
        name: '45/4',
        short_name: '45/4',
        description: '٤ أيام · خطتك الشخصية — رفيقك في النادي',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF6EF',
        theme_color: '#FAF6EF',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        // الواجهة + الخطوط + الرسومات (مضمّنة في الحزمة) تُخزَّن للعمل دون اتصال
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 3_000_000,
      },
    }),
  ],
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 700 },
  server: { host: true, port: 5173 },
  test: { environment: 'node', globals: true, include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] },
});
