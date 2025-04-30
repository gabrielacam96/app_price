import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/app": {
        target: "http://127.0.0.1:8000", // Base URL of your Django backend
        changeOrigin: true,
        secure: false,
      },
    },

      port: 5174, // You can set the port number you want
      open: true, // (optional) opens the browser automatically
    
  },
});

