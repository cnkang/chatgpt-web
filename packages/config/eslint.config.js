// Shared ESLint configuration for ChatGPT Web monorepo
import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    'docker-compose/**',
    'kubernetes/**',
    'service/build/**',
    'apps/*/build/**',
    'apps/*/dist/**',
    'packages/*/dist/**',
    'dist/**',
    '.kiro/**',
    'node_modules/**',
    '**/node_modules/**',
    '*.d.ts',
    '**/*.md',
  ],
  typescript: true,
  vue: true,
  formatters: {
    css: true,
    html: true,
    markdown: 'prettier',
  },
  rules: {
    // Zero-warning policy - treat warnings as errors
    'no-console': 'off',
    'no-debugger': 'error',

    // Node.js specific rules
    'node/prefer-global/process': 'off',
    'no-restricted-globals': 'off',

    // TypeScript specific rules (only for .ts/.tsx files)
    'ts/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'ts/no-explicit-any': 'off',

    // Vue specific rules
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    'vue/component-definition-name-casing': ['error', 'PascalCase'],
    'vue/no-unused-components': 'error',
    'vue/no-unused-vars': 'error',

    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // Performance rules
    'no-await-in-loop': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',

    // Code quality rules - temporarily relaxed for modernization
    complexity: 'off', // Temporarily disabled
    'max-depth': 'off', // Temporarily disabled
    'max-lines-per-function': 'off', // Temporarily disabled

    // Style rules - temporarily relaxed for tab cleanup
    'style/no-tabs': 'off', // Temporarily disabled for modernization
    'style/indent': 'off', // Temporarily disabled for modernization
    'vue/html-indent': 'off', // Temporarily disabled for modernization
    'style/brace-style': 'off', // Temporarily disabled
    'style/member-delimiter-style': 'off', // Temporarily disabled
    'antfu/if-newline': 'off', // Temporarily disabled
    'style/arrow-parens': 'off', // Temporarily disabled
    'style/operator-linebreak': 'off', // Temporarily disabled
    'style/indent-binary-ops': 'off', // Temporarily disabled
    'perfectionist/sort-imports': 'off', // Temporarily disabled
  },
})
