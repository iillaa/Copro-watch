import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg'],
      manifest: {
        name: 'Gestionnaire de Visites Médicales',
        short_name: 'MedVisit',
        description: 'Offline SPA to manage medical visits',
        icons: [{ src: 'app-icon.svg', sizes: '192x192', type: 'image/svg+xml' }],
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
      },
    }),
  ],
  base: './', // This is crucial for offline use
  build: {
    // Ensure the output is compatible with older browsers just in case
    target: 'esnext',
    assetsInlineLimit: 100000000, // Try to inline everything
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false, // Don't split CSS
    brotliSize: false,
    rollupOptions: {
      inlineDynamicImports: true,
      output: {
        manualChunks: undefined,
      },
    },
  },
});
