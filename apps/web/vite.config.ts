import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_TARGET = process.env.BEACON_API ?? 'http://localhost:3000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy REST calls to the Beacon server so the client is same-origin in dev.
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
})
