import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
      react(),
          // Restore the actual configuration object here:
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
                                                                                                      build: {
                                                                                                          outDir: 'dist',
                                                                                                              emptyOutDir: true,
                                                                                                                }
                                                                                                                });