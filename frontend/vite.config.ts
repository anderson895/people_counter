import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy REST API calls to Flask
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxy WebSocket connection to Flask-SocketIO
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: '../static',   // Flask serves built files from /static
    emptyOutDir: true,
  },
})
