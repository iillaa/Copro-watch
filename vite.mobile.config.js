import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg'],
      manifest: {
        name: 'CoproWatch Mobile',
        short_name: 'CW Mobile',
        theme_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait'
      },
    }),
  ],
  build: {
    outDir: 'dist-mobile', // 1. Separate Output Folder
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        // 2. THIS IS THE SECRET: Point to mobile.html
        mobile: 'mobile.html', 
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-icons'],
          'db-vendor': ['dexie', 'localforage'],
        },
      },
    },
  },
});