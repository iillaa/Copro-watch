import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './', // Important pour que les liens soient relatifs (file://)
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000, // Force tout (images, CSS) dans le JS
    cssCodeSplit: false, // Empêche de créer un fichier .css séparé
    rollupOptions: {
      // CORRECTION ICI : on déplace inlineDynamicImports dans 'output'
      output: {
        inlineDynamicImports: true,
      },
    },
    outDir: 'dist-standalone', // Dossier de sortie séparé
    emptyOutDir: true, // Nettoie le dossier avant de construire
  },
});