import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change 'reading-tracker' to your actual GitHub repository name
export default defineConfig({
  plugins: [react()],
  base: '/reading-tracker/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
})
