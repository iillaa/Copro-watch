import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import { VitePWA } from 'vite-plugin-pwa';
// REMOVE: import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [
    react(),
    // REMOVE: viteSingleFile(),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['app-icon.svg'],
    //   manifest: {
    //     name: 'Gestionnaire de Visites Médicales',
    //     short_name: 'MedVisit',
    //     description: 'Offline SPA to manage medical visits',
    //     icons: [{ src: 'app-icon.svg', sizes: '192x192', type: 'image/svg+xml' }],
    //     theme_color: '#ffffff',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //   },
    // }),
  ],
  base: './',
  build: {
    target: 'esnext',
    // REMOVE: assetsInlineLimit: 100000000,
    // REMOVE: cssCodeSplit: false,
    rollupOptions: {
      // REMOVE: inlineDynamicImports: true,
      output: {
        manualChunks: undefined,
      },
    },
  },
});
