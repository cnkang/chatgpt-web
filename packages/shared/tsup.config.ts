import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  treeshake: true,
  target: 'es2022',
  // Development optimizations
  watch: process.env.NODE_ENV === 'development',
  onSuccess: async () => {
    // Notify consuming packages of changes for hot reload
    if (process.env.NODE_ENV === 'development') {
      console.log('📦 Shared package rebuilt - triggering hot reload')
    }
  },
  // Bundle analysis for optimization
  metafile: process.env.ANALYZE === 'true',
})
