import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers['range']) {
              proxyReq.setHeader('Range', req.headers['range']);
            }
          });
        },
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers['range']) {
              proxyReq.setHeader('Range', req.headers['range']);
            }
          });
        },
      },
      '/recordings': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            if (req.headers['range']) {
              proxyReq.setHeader('Range', req.headers['range']);
            }
          });
        },
      },
    },

  },
});
