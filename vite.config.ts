import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Pokédex Collection Manager',
        short_name: 'Pokédex',
        description: 'Track your Pokémon, TCG card, and game collection.',
        theme_color: '#0b3360',
        background_color: '#0b3360',
        display: 'standalone',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only the app shell — the ~570MB of Pokémon/TCG images and the compiled data
        // JSON files must NOT be swept into the precache (that would make the install itself
        // huge and slow). `globIgnores` is a belt-and-suspenders guard in case a future asset
        // extension coincidentally matches `globPatterns`.
        globPatterns: ['**/*.{js,css,html}'],
        globIgnores: ['images/**', 'data/**'],
        runtimeCaching: [
          {
            // Pokémon sprites, game icons, TCG card art — content-addressed by filename and
            // never change once downloaded, so once cached they're never re-fetched.
            urlPattern: /\/images\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pokedex-images',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Compiled data JSON — serve the cached copy instantly (works offline) while
            // checking for a newer version in the background, since this does get regenerated.
            urlPattern: /\/data\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pokedex-data',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // In dev: serve from root so `npm run dev` opens at http://localhost:5175/
  // In build: use the GitHub Pages sub-path for correct asset/image URLs
  base: command === 'build' ? '/pokedex-collection-manager/' : '/',
  build: {
    outDir: 'dist',
  },
  server: {
    host: true,
    port: 5175,
  },
}))
