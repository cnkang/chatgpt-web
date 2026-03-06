import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import type { PluginOption } from 'vite'
import { defineConfig, loadEnv } from 'vite'

function setupPlugins(): PluginOption[] {
  return [
    vue({
      // Optimize Vue compilation for Vue 3.5+ features
      script: {
        defineModel: true,
        propsDestructure: true,
      },
      // Enable Vue 3.5+ performance optimizations
      template: {
        compilerOptions: {
          // Enable modern browser optimizations
          hoistStatic: true,
          cacheHandlers: true,
        },
      },
    }),
  ]
}

type ChunkMatcher = { name: string; match: (id: string) => boolean }

const vendorChunkMatchers: ChunkMatcher[] = [
  {
    name: 'vue',
    match: id => id.includes('vue') && !id.includes('vue-router') && !id.includes('vue-i18n'),
  },
  { name: 'vue-router', match: id => id.includes('vue-router') },
  { name: 'pinia', match: id => id.includes('pinia') },
  { name: 'vue-i18n', match: id => id.includes('vue-i18n') },
  { name: 'vueuse', match: id => id.includes('@vueuse') },
  { name: 'naive-ui', match: id => id.includes('naive-ui') },
  { name: 'katex', match: id => id.includes('katex') },
  { name: 'icons', match: id => id.includes('@iconify') },
  { name: 'html-to-image', match: id => id.includes('html-to-image') },
]

function resolveManualChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined

  for (const matcher of vendorChunkMatchers) {
    if (matcher.match(id)) return matcher.name
  }

  return 'vendor'
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

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: setupPlugins(),
    server: {
      host: '0.0.0.0',
      port: 1002,
      open: false,
      // Enhanced HMR for Node.js 24 and cross-package development
      hmr: {
        overlay: true,
        port: 24678, // Dedicated HMR port to avoid conflicts
      },
      // Watch for changes in workspace packages
      watch: {
        // Watch shared package for hot reloading
        ignored: ['!**/node_modules/@chatgpt-web/**'],
        usePolling: false,
        interval: 100,
        binaryInterval: 300,
      },
      // Optimized for development performance
      fs: {
        strict: false,
        allow: [
          // Allow access to workspace packages
          '../../packages',
          '../../node_modules',
          '../..',
        ],
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
      // Performance optimization for Node.js 24 - ESNext target for latest 2 major versions
      target: ['esnext', 'chrome131', 'firefox133', 'safari18'], // Latest 2 major versions of mainstream browsers
      reportCompressedSize: false, // Disable compressed size reporting for faster builds
      sourcemap: false, // Disable sourcemap in production for performance

      // Code splitting optimization - simplified strategy to avoid circular dependencies
      rollupOptions: {
        output: {
          // Simplified code splitting strategy, avoiding circular dependencies
          manualChunks: id => resolveManualChunk(id),
          // Optimize file names for better caching
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: assetInfo => {
            if (!assetInfo.name) return 'assets/[name]-[hash].[ext]'
            const info = assetInfo.name.split('.')
            let extType = info[info.length - 1]
            if (/\.(?:mp4|webm|ogg|mp3|wav|flac|aac)(?:\?.*)?$/i.test(assetInfo.name)) {
              extType = 'media'
            } else if (/\.(?:png|jpe?g|gif|svg)(?:\?.*)?$/i.test(assetInfo.name)) {
              extType = 'img'
            } else if (/\.(?:woff2?|eot|ttf|otf)(?:\?.*)?$/i.test(assetInfo.name)) {
              extType = 'fonts'
            }
            return `${extType}/[name]-[hash].[ext]`
          },
        },

        // More aggressive tree-shaking for Node.js 24
        treeshake: {
          preset: 'recommended',
          manualPureFunctions: ['console.log', 'console.info', 'console.debug'],
          moduleSideEffects: false, // Assume all modules have no side effects for aggressive tree-shaking
        },
      },

      // Compression optimization - esbuild optimization configuration
      minify: 'esbuild',
      esbuildOptions: {
        drop: isProduction ? ['console', 'debugger'] : [],
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true,
        treeShaking: true,
        // More aggressive compression
        legalComments: 'none',
        // Node.js 24 specific optimizations - ESNext target
        target: 'esnext',
        platform: 'browser',
      },

      // Build optimization - optimized for small files
      chunkSizeWarningLimit: 500, // Lower warning threshold to 500KB
      assetsInlineLimit: 4096, // Inline resources under 4KB as base64

      commonjsOptions: {
        ignoreTryCatch: false,
      },
    },

    // Optimize dependency pre-building for Node.js 24
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', '@vueuse/core', 'vue-i18n'],
      exclude: [
        // Exclude large libraries for on-demand loading and splitting
        'katex',
        'naive-ui', // Let UI library load on demand
        'html-to-image',
      ],
      // Node.js 24 specific optimizations - ESNext target
      esbuildOptions: {
        target: 'esnext',
      },
    },

    // Enhanced development experience
    css: {
      devSourcemap: true,
    },

    // Enable experimental features for Node.js 24
    experimental: {
      // Enable build optimization
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === 'js') {
          return { js: `/${filename}` }
        } else {
          return { relative: true }
        }
      },
    },

    // Define global constants for better tree-shaking
    define: {
      __VUE_OPTIONS_API__: false, // Disable Options API for smaller bundle
      __VUE_PROD_DEVTOOLS__: false, // Disable devtools in production
    },
  }
})
