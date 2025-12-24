import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg', 'manifest.json'],
      manifest: {
        name: 'Gestionnaire de Visites Médicales',
        short_name: 'MedVisit',
        description: 'Offline SPA to manage medical visits',
        icons: [{ src: 'app-icon.svg', sizes: '192x192', type: 'image/svg+xml' }],
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    }),
  ],
  base: './', 
  build: {
    target: 'esnext',
    // 🛑 CRITICAL FIX FOR TERMUX: Disable Minification
    // This stops the "terser" crash by skipping code compression.
    minify: false, 
    
    assetsInlineLimit: 4096, 
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true, 
    sourcemap: false, 
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});

