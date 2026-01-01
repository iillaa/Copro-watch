import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ /* ... keep your existing PWA config ... */ })
  ],
  build: {
    outDir: 'dist', // Standard output folder
    emptyOutDir: true,
  }
});
