import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import type { Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'

function resolveAssetFileName(name?: string) {
  if (!name) return 'assets/[name]-[hash].[ext]'
  if (/\.(?:mp4|webm|ogg|mp3|wav|flac|aac)(?:\?.*)?$/i.test(name)) {
    return 'media/[name]-[hash].[ext]'
  }
  if (/\.(?:png|jpe?g|gif|svg)(?:\?.*)?$/i.test(name)) {
    return 'img/[name]-[hash].[ext]'
  }
  if (/\.(?:woff2?|eot|ttf|otf)(?:\?.*)?$/i.test(name)) {
    return 'fonts/[name]-[hash].[ext]'
  }
  return 'assets/[name]-[hash].[ext]'
}

function normalizeFilePath(filePath: string) {
  return filePath.replace(/\\/g, '/')
}

function markstreamD2StubPlugin(enableD2: boolean): Plugin {
  const stubPath = path.resolve(__dirname, 'src/plugins/markstreamD2Disabled.ts')
  const markstreamExportsPattern = /\/node_modules\/markstream-vue\/dist\/exports\.js$/
  const markstreamD2Pattern = /\/node_modules\/markstream-vue\/dist\/index7\.js$/

  return {
    name: 'markstream-d2-stub',
    enforce: 'pre',
    resolveId(source, importer) {
      if (enableD2) return null

      const normalizedSource = normalizeFilePath(source)
      const normalizedImporter = importer ? normalizeFilePath(importer) : ''

      if (
        (source === './index7.js' && markstreamExportsPattern.test(normalizedImporter)) ||
        markstreamD2Pattern.test(normalizedSource)
      ) {
        return stubPath
      }

      return null
    },
  }
}

export default defineConfig(env => {
  const repoRoot = path.resolve(__dirname, '../..')
  const rootEnv = loadEnv(env.mode, repoRoot)

  // Ensure root-level VITE_* variables are visible to Vite's internal env loading.
  for (const [key, value] of Object.entries(rootEnv)) {
    if (key.startsWith('VITE_') && !process.env[key]) process.env[key] = value
  }

  const packageEnv = loadEnv(env.mode, process.cwd())
  const viteEnv = { ...rootEnv, ...packageEnv } as unknown as ImportMetaEnv
  const isProduction = env.mode === 'production'
  const enableMarkstreamD2 = viteEnv.VITE_APP_ENABLE_D2 === 'true'

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      markstreamD2StubPlugin(enableMarkstreamD2),
      vue({
        script: {
          defineModel: true,
        },
      }),
    ],
    server: {
      host: '0.0.0.0',
      port: 1002,
      open: false,
      hmr: {
        overlay: true,
        port: 24678,
      },
      watch: {
        ignored: ['!**/node_modules/@chatgpt-web/**'],
        usePolling: false,
        interval: 100,
        binaryInterval: 300,
      },
      fs: {
        strict: false,
        allow: ['../../packages', '../../node_modules', '../..'],
      },
      proxy: {
        '/api': {
          target: viteEnv.VITE_APP_API_BASE_URL,
          changeOrigin: true,
          rewrite: path => path.replace('/api/', '/'),
        },
      },
    },
    build: {
      target: ['esnext', 'chrome131', 'firefox133', 'safari18'],
      reportCompressedSize: false,
      sourcemap: false,
      rollupOptions: {
        output: {
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: assetInfo => resolveAssetFileName(assetInfo.name),
        },
      },
      minify: 'esbuild',
      esbuildOptions: {
        drop: isProduction ? ['console', 'debugger'] : [],
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true,
        treeShaking: true,
        legalComments: 'none',
        target: 'esnext',
        platform: 'browser',
      },
      chunkSizeWarningLimit: 800,
      assetsInlineLimit: 4096,
      commonjsOptions: {
        ignoreTryCatch: false,
      },
    },
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', '@vueuse/core', 'vue-i18n'],
      esbuildOptions: {
        target: 'esnext',
      },
    },
    css: {
      devSourcemap: true,
    },
    define: {
      __VUE_OPTIONS_API__: false,
      __VUE_PROD_DEVTOOLS__: false,
    },
  }
})
