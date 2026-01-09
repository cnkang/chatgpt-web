import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import type { PluginOption } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

function setupPlugins(env: ImportMetaEnv): PluginOption[] {
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
		env.VITE_GLOB_APP_PWA === 'true' &&
			VitePWA({
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

export default defineConfig(env => {
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
			// Enhanced HMR for Node.js 24
			hmr: {
				overlay: true,
			},
			// Optimized for development performance
			fs: {
				strict: false,
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
					manualChunks: id => {
						if (id.includes('node_modules')) {
							// Vue ecosystem
							if (id.includes('vue') && !id.includes('vue-router') && !id.includes('vue-i18n')) {
								return 'vue'
							}
							if (id.includes('vue-router')) {
								return 'vue-router'
							}
							if (id.includes('pinia')) {
								return 'pinia'
							}
							if (id.includes('vue-i18n')) {
								return 'vue-i18n'
							}
							if (id.includes('@vueuse')) {
								return 'vueuse'
							}

							// UI libraries - unified handling to avoid circular dependencies
							if (id.includes('naive-ui')) {
								return 'naive-ui'
							}

							// Markdown and chart libraries - grouped by main functionality
							if (id.includes('mermaid')) {
								return 'mermaid'
							}
							if (id.includes('katex')) {
								return 'katex'
							}
							if (id.includes('markdown-it')) {
								return 'markdown'
							}
							if (id.includes('highlight.js')) {
								return 'highlight'
							}

							// Utility libraries
							if (id.includes('crypto-js')) {
								return 'crypto'
							}
							if (id.includes('@iconify')) {
								return 'icons'
							}
							if (id.includes('html-to-image')) {
								return 'html-to-image'
							}

							// Other third-party libraries
							return 'vendor'
						}

						// Application code - simplified grouping to avoid circular dependencies
						if (id.includes('/src/')) {
							// Let Vite handle application code automatically for better optimization
							return undefined
						}
					},
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
				'mermaid',
				'katex',
				'highlight.js',
				'naive-ui', // Let UI library load on demand
				'markdown-it',
				'@md-reader/markdown-it-mermaid',
				'@vscode/markdown-it-katex',
				'html-to-image',
				'crypto-js',
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
