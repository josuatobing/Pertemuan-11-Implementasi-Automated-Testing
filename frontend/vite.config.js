import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Port 3000 sudah terdaftar di CORS_ALLOWED_ORIGINS backend, tapi kita juga
// proxy /api dan /media ke Django supaya request-nya same-origin (bebas CORS).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8000',
      '/media': 'http://localhost:8000',
    },
  },
})
