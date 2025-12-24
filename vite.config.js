import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// REMOVED: import { viteSingleFile } from 'vite-plugin-singlefile'; 
// (This was causing the crash on Termux)
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // REMOVED: viteSingleFile(), 
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg', 'manifest.json'], // Ensure manifest is included
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'] // Cache standard files
      }
    }),
  ],
  base: './', // Keep this for Capacitor relative paths
  build: {
    target: 'esnext',
    // REMOVED: assetsInlineLimit: 100000000 (Caused the Memory Crash)
    assetsInlineLimit: 4096, // Return to default (4kb)
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true, // Allow splitting for better performance
    sourcemap: false, // Save memory/space
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});

