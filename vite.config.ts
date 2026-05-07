import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/nanoaicanvas/',
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
      '/api/wuyinkeji': {
        target: 'https://api.wuyinkeji.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wuyinkeji/, '/api'),
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // 禁用缓存，确保轮询获取最新状态
            proxyRes.headers['cache-control'] = 'no-cache, no-store, must-revalidate'
            proxyRes.headers['pragma'] = 'no-cache'
            proxyRes.headers['expires'] = '0'
          })
        },
      },
      '/api/v2/admin': {
        target: 'http://64.118.135.134:8002',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://64.118.135.134:8002',
        changeOrigin: true,
        secure: false,
      },
      '/prompt-restrictions': {
        target: 'http://64.118.135.134:8002/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/prompt-restrictions/, '/prompt-restrictions'),
        secure: false,
      },
      '/auth': {
        target: 'http://64.118.135.134:8002',
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
          // React 核心
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor'
          }
          // Redux 状态管理
          if (id.includes('node_modules/@reduxjs/') || id.includes('node_modules/react-redux/')) {
            return 'redux-vendor'
          }
          // React Flow 画布核心
          if (id.includes('node_modules/reactflow/')) {
            return 'reactflow-vendor'
          }
          // Radix UI 组件库（按需分割）
          if (id.includes('node_modules/@radix-ui/')) {
            return 'ui-vendor'
          }
          // Lucide 图标库
          if (id.includes('node_modules/lucide-react/')) {
            return 'icons-vendor'
          }
          // i18next 国际化
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
