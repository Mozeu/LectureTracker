import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change 'reading-tracker' to your actual GitHub repository name
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
})