import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig({ mode: 'test', command: 'serve' }),
  defineConfig({
    test: {
      environment: 'node',
      globals: true,
      include: ['src/**/*.test.ts'],
      clearMocks: true,
      restoreMocks: true,
    },
  }),
)
