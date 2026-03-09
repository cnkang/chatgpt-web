import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    vue({
      script: {
        defineModel: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
