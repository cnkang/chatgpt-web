import type { PluginOption } from 'vite'
import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

function setupPlugins(env: ImportMetaEnv): PluginOption[] {
  return [
    vue({
      // 优化 Vue 编译
      script: {
        defineModel: true,
        propsDestructure: true,
      },
    }),
    env.VITE_GLOB_APP_PWA === 'true' && VitePWA({
      injectRegister: 'auto',
      manifest: {
        name: 'chatGPT',
        short_name: 'chatGPT',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ]
}

export default defineConfig((env) => {
  const viteEnv = loadEnv(env.mode, process.cwd()) as unknown as ImportMetaEnv
  const isProduction = env.mode === 'production'

  return {
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    plugins: setupPlugins(viteEnv),
    server: {
      host: '0.0.0.0',
      port: 1002,
      open: false,
      proxy: {
        '/api': {
          target: viteEnv.VITE_APP_API_BASE_URL,
          changeOrigin: true, // 允许跨域
          rewrite: path => path.replace('/api/', '/'),
        },
      },
    },
    build: {
      // 性能优化
      target: 'esnext', // 最新 ES 标准，最小化 polyfill
      reportCompressedSize: false, // 禁用压缩大小报告以加快构建
      sourcemap: false, // 生产环境禁用 sourcemap

      // 代码分割优化
      rollupOptions: {
        output: {
          // 手动分割代码块 - 进一步优化
          manualChunks: (id) => {
            // 更智能的代码分割策略
            if (id.includes('node_modules')) {
              // Vue 生态系统
              if (id.includes('vue') || id.includes('pinia') || id.includes('@vue')) {
                return 'vue-vendor'
              }
              // UI 库
              if (id.includes('naive-ui')) {
                return 'ui-vendor'
              }
              // 工具库
              if (id.includes('@vueuse') || id.includes('lodash')) {
                return 'utils-vendor'
              }
              // Markdown 和数学公式相关 - 按需加载
              if (id.includes('markdown-it') || id.includes('katex') || id.includes('mermaid')) {
                return 'markdown-vendor'
              }
              // 代码高亮
              if (id.includes('highlight.js')) {
                return 'highlight-vendor'
              }
              // 国际化
              if (id.includes('vue-i18n')) {
                return 'i18n-vendor'
              }
              // 其他第三方库
              return 'vendor'
            }
          },
          // 优化文件名
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.\w+$/, '') || 'chunk'
              : 'chunk'
            return `js/${facadeModuleId}-[hash].js`
          },
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (!assetInfo.name)
              return 'assets/[name]-[hash].[ext]'
            const info = assetInfo.name.split('.')
            let extType = info[info.length - 1]
            if (/\.(?:mp4|webm|ogg|mp3|wav|flac|aac)(?:\?.*)?$/i.test(assetInfo.name)) {
              extType = 'media'
            }
            else if (/\.(?:png|jpe?g|gif|svg)(?:\?.*)?$/i.test(assetInfo.name)) {
              extType = 'img'
            }
            else if (/\.(?:woff2?|eot|ttf|otf)(?:\?.*)?$/i.test(assetInfo.name)) {
              extType = 'fonts'
            }
            return `${extType}/[name]-[hash].[ext]`
          },
        },
        // 外部化依赖（如果需要 CDN）
        // external: ['vue', 'vue-router'],

        // 更激进的 tree-shaking
        treeshake: {
          preset: 'recommended',
          manualPureFunctions: ['console.log', 'console.info', 'console.debug'],
        },
      },

      // 压缩优化 - esbuild 优化配置
      minify: 'esbuild',
      esbuildOptions: {
        drop: isProduction ? ['console', 'debugger'] : [],
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true,
        treeShaking: true,
      },

      // 构建优化
      chunkSizeWarningLimit: 1000, // 提高警告阈值到 1MB
      assetsInlineLimit: 4096, // 4KB 以下的资源内联为 base64

      commonjsOptions: {
        ignoreTryCatch: false,
      },
    },

    // 优化依赖预构建
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'pinia',
        '@vueuse/core',
        'naive-ui',
        'vue-i18n',
      ],
      exclude: [
        // 排除大型库，让它们按需加载
        'mermaid',
        'katex',
      ],
    },

    // 实验性功能
    experimental: {
      // 启用构建优化
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === 'js') {
          return { js: `/${filename}` }
        }
        else {
          return { relative: true }
        }
      },
    },
  }
})
