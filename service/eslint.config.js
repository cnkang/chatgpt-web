import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    'build/**',
  ],
  rules: {
    // 允许在 Node.js 环境中使用全局 process
    'node/prefer-global/process': 'off',
    // 允许使用 global（在某些情况下是必要的）
    'no-restricted-globals': 'off',
  },
})
