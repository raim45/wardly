import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The React app talks to the FastAPI backend on :8000. In dev, Vite proxies the
// API paths so the frontend uses same-origin relative URLs exactly as it will
// in production, when FastAPI serves the built assets itself.
const API = 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/login': API,
      '/patients': API,
      '/audit-log': API,
    },
  },
})
