import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Use root base for Vercel deployments. GitHub Pages requires '/repo-name/'.
  base: '/',
  plugins: [react()],
})
