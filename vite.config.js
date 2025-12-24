import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// NOTE: VitePWA is removed because Service Workers do not work 
// when opening index.html directly via file:// (No Server Mode).

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(), // Merges everything into one HTML file
  ],
  base: './', // Crucial for offline/relative paths
  build: {
    target: 'esnext',
    outDir: 'dist',
    
    // 🛑 CRITICAL: Disable Minification to prevent Termux Crash
    // This makes the file slightly larger (e.g. 3MB vs 1MB) but guarantees it builds.
    minify: false, 
    
    // Ensure CSS is inlined
    cssCodeSplit: false, 
    
    // Allow large assets to be inlined (up to 100MB)
    assetsInlineLimit: 100000000, 
    
    // Prevent chunking (we want one file)
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});

