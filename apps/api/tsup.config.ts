import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'build',
  target: 'es2022',
  format: ['esm'],
  splitting: false,
  sourcemap: true,
  minify: false,
  shims: true,
  dts: false,
  // Development optimizations
  watch: process.env.NODE_ENV === 'development',
  onSuccess: async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 API rebuilt successfully')
    }
  },
  // External dependencies optimization
  external: [
    // Don't bundle workspace dependencies in development
    '@chatgpt-web/shared',
  ],
  // Bundle analysis
  metafile: process.env.ANALYZE === 'true',
})
