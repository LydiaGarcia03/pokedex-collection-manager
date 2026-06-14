import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // In dev: serve from root so `npm run dev` opens at http://localhost:5175/
  // In build: use the GitHub Pages sub-path for correct asset/image URLs
  base: command === 'build' ? '/pokedex-collection-manager-static/' : '/',
  build: {
    outDir: 'dist',
  },
  server: {
    host: true,
    port: 5175,
  },
}))
