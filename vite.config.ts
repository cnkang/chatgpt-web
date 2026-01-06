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
          // 更细粒度的手动分割代码块 - 目标：单文件 < 500KB
          manualChunks: (id) => {
            // 更智能的代码分割策略
            if (id.includes('node_modules')) {
              // Vue 核心 - 分离核心和扩展
              if (id.includes('vue/dist') || id.includes('@vue/runtime')) {
                return 'vue-core'
              }
              if (id.includes('vue-router')) {
                return 'vue-router'
              }
              if (id.includes('pinia')) {
                return 'pinia'
              }
              if (id.includes('@vue/') || id.includes('vue-demi')) {
                return 'vue-utils'
              }

              // UI 库 - 按功能模块分割
              if (id.includes('naive-ui')) {
                // 基础组件
                if (id.includes('button') || id.includes('input') || id.includes('form') || id.includes('select')) {
                  return 'ui-basic'
                }
                // 布局组件
                if (id.includes('layout') || id.includes('grid') || id.includes('space') || id.includes('divider')) {
                  return 'ui-layout'
                }
                // 反馈组件
                if (id.includes('modal') || id.includes('drawer') || id.includes('popover') || id.includes('tooltip')) {
                  return 'ui-feedback'
                }
                // 数据展示
                if (id.includes('table') || id.includes('list') || id.includes('tree') || id.includes('card')) {
                  return 'ui-data'
                }
                // 导航组件
                if (id.includes('menu') || id.includes('breadcrumb') || id.includes('tabs') || id.includes('steps')) {
                  return 'ui-nav'
                }
                return 'ui-misc'
              }

              // 工具库
              if (id.includes('@vueuse/core')) {
                return 'vueuse'
              }
              if (id.includes('lodash')) {
                return 'lodash'
              }

              // Markdown 相关 - 最细分割
              if (id.includes('markdown-it') && !id.includes('mermaid') && !id.includes('katex')) {
                return 'markdown-core'
              }

              // 数学公式渲染 - 单独分割（通常很大）
              if (id.includes('katex')) {
                if (id.includes('fonts') || id.includes('css')) {
                  return 'katex-assets'
                }
                return 'katex-core'
              }
              if (id.includes('@vscode/markdown-it-katex')) {
                return 'markdown-katex'
              }

              // Mermaid - 最激进的分割（最大的库）
              if (id.includes('mermaid')) {
                // 核心引擎 - 进一步细分
                if (id.includes('mermaidAPI') || id.includes('diagram-api')) {
                  return 'mermaid-api'
                }
                if (id.includes('parser') || id.includes('grammar')) {
                  return 'mermaid-parser'
                }
                if (id.includes('config') || id.includes('theme')) {
                  return 'mermaid-config'
                }
                
                // 渲染引擎 - 分离不同的渲染器
                if (id.includes('render') && id.includes('svg')) {
                  return 'mermaid-svg-render'
                }
                if (id.includes('render') && (id.includes('d3') || id.includes('dagre'))) {
                  return 'mermaid-d3-render'
                }
                if (id.includes('render')) {
                  return 'mermaid-render-base'
                }
                
                // 布局引擎
                if (id.includes('dagre') || id.includes('layout')) {
                  return 'mermaid-layout'
                }
                if (id.includes('d3') && !id.includes('render')) {
                  return 'mermaid-d3-utils'
                }
                
                // 流程图 - 按复杂度分割
                if (id.includes('flowchart-v2') || id.includes('flowDiagram-v2')) {
                  return 'mermaid-flow-v2'
                }
                if (id.includes('flowchart') || id.includes('flowDiagram') || id.includes('flow')) {
                  return 'mermaid-flow-v1'
                }
                
                // 时序图
                if (id.includes('sequence') || id.includes('sequenceDiagram')) {
                  return 'mermaid-sequence'
                }
                
                // 甘特图
                if (id.includes('gantt')) {
                  return 'mermaid-gantt'
                }
                
                // 类图和ER图
                if (id.includes('classDiagram-v2')) {
                  return 'mermaid-class-v2'
                }
                if (id.includes('class') || id.includes('classDiagram')) {
                  return 'mermaid-class-v1'
                }
                if (id.includes('er') || id.includes('erDiagram')) {
                  return 'mermaid-er'
                }
                
                // 状态图
                if (id.includes('stateDiagram-v2')) {
                  return 'mermaid-state-v2'
                }
                if (id.includes('state') || id.includes('stateDiagram')) {
                  return 'mermaid-state-v1'
                }
                
                // 饼图和旅程图
                if (id.includes('pie') || id.includes('pieDiagram')) {
                  return 'mermaid-pie'
                }
                if (id.includes('journey') || id.includes('user-journey')) {
                  return 'mermaid-journey'
                }
                
                // Git图
                if (id.includes('git') || id.includes('gitGraph')) {
                  return 'mermaid-git'
                }
                
                // C4图
                if (id.includes('c4') || id.includes('c4Diagram')) {
                  return 'mermaid-c4'
                }
                
                // 架构图
                if (id.includes('architecture') || id.includes('architectureDiagram')) {
                  return 'mermaid-architecture'
                }
                
                // 块图
                if (id.includes('block') || id.includes('blockDiagram')) {
                  return 'mermaid-block'
                }
                
                // XY图表
                if (id.includes('xychart') || id.includes('xyChart')) {
                  return 'mermaid-xychart'
                }
                
                // 象限图
                if (id.includes('quadrant') || id.includes('quadrantChart')) {
                  return 'mermaid-quadrant'
                }
                
                // 桑基图
                if (id.includes('sankey') || id.includes('sankeyDiagram')) {
                  return 'mermaid-sankey'
                }
                
                // 时间线
                if (id.includes('timeline')) {
                  return 'mermaid-timeline'
                }
                
                // 思维导图
                if (id.includes('mindmap')) {
                  return 'mermaid-mindmap'
                }
                
                // 看板图
                if (id.includes('kanban')) {
                  return 'mermaid-kanban'
                }
                
                // 需求图
                if (id.includes('requirement')) {
                  return 'mermaid-requirement'
                }
                
                // 信息图
                if (id.includes('info') || id.includes('infoDiagram')) {
                  return 'mermaid-info'
                }
                
                // 通用工具
                if (id.includes('utils') || id.includes('common')) {
                  return 'mermaid-utils'
                }
                
                return 'mermaid-other'
              }
              if (id.includes('@md-reader/markdown-it-mermaid')) {
                return 'markdown-mermaid'
              }

              // 代码高亮 - 按语言分割
              if (id.includes('highlight.js')) {
                if (id.includes('languages') || id.includes('lang-')) {
                  return 'highlight-langs'
                }
                return 'highlight-core'
              }

              // 国际化
              if (id.includes('vue-i18n')) {
                return 'i18n'
              }

              // 图标库
              if (id.includes('@iconify')) {
                return 'icons'
              }

              // HTTP 库
              if (id.includes('axios')) {
                return 'http'
              }

              // 加密库
              if (id.includes('crypto-js')) {
                return 'crypto'
              }

              // 图像处理
              if (id.includes('html-to-image')) {
                return 'image-utils'
              }

              // 其他第三方库
              return 'vendor'
            }

            // 应用代码分割
            if (id.includes('/src/')) {
              if (id.includes('/components/')) {
                return 'components'
              }
              if (id.includes('/views/') || id.includes('/pages/')) {
                return 'pages'
              }
              if (id.includes('/utils/') || id.includes('/helpers/')) {
                return 'app-utils'
              }
              if (id.includes('/stores/') || id.includes('/store/')) {
                return 'stores'
              }
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
          moduleSideEffects: false, // 假设所有模块都没有副作用，更激进的 tree-shaking
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
        // 更激进的压缩
        legalComments: 'none',
      },

      // 构建优化 - 针对小文件优化
      chunkSizeWarningLimit: 500, // 降低警告阈值到 500KB
      assetsInlineLimit: 4096, // 4KB 以下的资源内联为 base64

      commonjsOptions: {
        ignoreTryCatch: false,
      },
    },

    // 优化依赖预构建 - 更激进的按需加载
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'pinia',
        '@vueuse/core',
        'vue-i18n',
      ],
      exclude: [
        // 排除大型库，让它们按需加载和分割
        'mermaid',
        'katex',
        'highlight.js',
        'naive-ui', // 让 UI 库按需加载
        'markdown-it',
        '@md-reader/markdown-it-mermaid',
        '@vscode/markdown-it-katex',
        'html-to-image',
        'crypto-js',
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
