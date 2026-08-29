import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import pkg from './package.json'

const BACKEND = 'http://64.118.135.134:8002'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/nanoai/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/constants': path.resolve(__dirname, './src/constants'),
      '@/assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 3000,
    host: true,
    open: true,
    proxy: {
      // base-prefixed proxy rules (browser requests /nanoai/api/...)
      '/nanoai/api/wuyinkeji': {
        target: 'https://api.wuyinkeji.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nanoai\/api\/wuyinkeji/, '/api'),
        secure: true,
      },
      '/nanoai/v2/': {
        target: BACKEND,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nanoai/, ''),
        secure: false,
      },
      '/nanoai/ws/': {
        target: BACKEND,
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/nanoai/, ''),
        secure: false,
      },
      '/nanoai/asset-uploads/': {
        target: BACKEND,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nanoai/, ''),
        secure: false,
      },
      '/nanoai/chat-uploads/': {
        target: BACKEND,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nanoai/, ''),
        secure: false,
      },
      '/nanoai/api': {
        target: BACKEND,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nanoai/, ''),
        secure: false,
      },
      '/nanoai/auth': {
        target: BACKEND,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nanoai\/auth/, '/api/auth'),
        secure: false,
      },
      '/nanoai/health': {
        target: BACKEND,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nanoai/, ''),
        secure: false,
      },

      // direct /api rules (fallback for non-base requests)
      '/api/wuyinkeji': {
        target: 'https://api.wuyinkeji.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wuyinkeji/, '/api'),
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache, no-store, must-revalidate'
            proxyRes.headers['pragma'] = 'no-cache'
            proxyRes.headers['expires'] = '0'
          })
        },
      },
      '/api/minimax': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        secure: false,
      },
      '/v2/': {
        target: BACKEND,
        changeOrigin: true,
        secure: false,
      },
      '/ws/': {
        target: BACKEND,
        changeOrigin: true,
        ws: true,
        secure: false,
      },
      '/auth': {
        target: BACKEND,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, '/api/auth'),
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/@reduxjs/') || id.includes('node_modules/react-redux/')) {
            return 'redux-vendor'
          }
          if (id.includes('node_modules/reactflow/')) {
            return 'reactflow-vendor'
          }
          if (id.includes('node_modules/@radix-ui/')) {
            return 'ui-vendor'
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'icons-vendor'
          }
          if (id.includes('node_modules/i18next/') || id.includes('node_modules/react-i18next/')) {
            return 'i18n-vendor'
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
