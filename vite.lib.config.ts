import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'NanoAiCanvas',
      formats: ['es', 'cjs'],
      fileName: (format) => `nanoai-canvas.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      // 外部化依赖，不打包到库中
      external: [
        'react',
        'react-dom',
        'react-redux',
        '@reduxjs/toolkit',
        'reactflow',
        'i18next',
        'react-i18next',
        'idb',
        'lucide-react',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        // Radix UI 组件
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-label',
        '@radix-ui/react-popover',
        '@radix-ui/react-select',
        '@radix-ui/react-separator',
        '@radix-ui/react-slider',
        '@radix-ui/react-slot',
        '@radix-ui/react-tabs',
        '@radix-ui/react-toast',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-progress',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-redux': 'ReactRedux',
          '@reduxjs/toolkit': 'ReduxToolkit',
          reactflow: 'ReactFlow',
          i18next: 'i18next',
          'react-i18next': 'ReactI18next',
          'lucide-react': 'LucideReact',
        },
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    // 生成 CSS 单独文件
    css: {
      postcss: './postcss.config.js',
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
})
