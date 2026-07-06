import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_TARGET = process.env.BEACON_API ?? 'http://localhost:3000'

const apiProxy = { '/api': { target: API_TARGET, changeOrigin: true } }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev server (`vite`). Proxy REST calls to the Beacon server so the client is
  // same-origin in dev.
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  // Production preview (`vite preview`) — used by the Windows web service to
  // serve the built app. Same-origin proxy so /api reaches the backend service.
  preview: {
    port: Number(process.env.PORT ?? 5173),
    proxy: apiProxy,
  },
})
