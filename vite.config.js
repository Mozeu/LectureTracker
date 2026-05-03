import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Si tu repo es "mozeu.github.io" (User Page) → base: '/'
 * Si tu repo es "reading-tracker" (Project Page) → base: '/reading-tracker/'
 *
 * Usando './' funciona en ambos casos con rutas relativas.
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
})
