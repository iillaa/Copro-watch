import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(), // Merges files for Offline Desktop use
    VitePWA({         // Generates Manifest for Android App
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg', 'manifest.json'],
      manifest: {
        name: 'Copro Watch',
        short_name: 'CoproWatch',
        description: 'Gestionnaire de Visites Médicales',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: 'app-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    }),
  ],
  base: './',
  build: {
    target: 'esnext',
    outDir: 'dist',
    
    // 🛑 CRITICAL: Disable Minification (Prevents Termux Crash)
    minify: false, 
    
    // Limits
    assetsInlineLimit: 100000000, 
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false, 
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
