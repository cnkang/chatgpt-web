import antfu from '@antfu/eslint-config'

export default antfu({
  linterOptions: {
    reportUnusedDisableDirectives: 'off',
  },
  ignores: ['build/**', 'eslint.config.js', '.vscode/**', '**/*.json', '**/*.jsonc', '**/*.md'],
  typescript: true,
  formatters: {
    markdown: 'prettier',
  },
  overrides: [
    {
      files: ['eslint.config.js'],
      rules: {
        'ts/consistent-type-imports': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
    {
      files: ['**/*.json', '**/*.jsonc'],
      rules: {
        'ts/consistent-type-imports': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
    {
      files: ['**/*.md'],
      rules: {
        'ts/consistent-type-imports': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
  ],
  rules: {
    // Zero-warning policy - treat warnings as errors
    'no-console': 'off', // Allow console statements for logging
    'no-debugger': 'error',

    // Node.js specific rules
    'node/prefer-global/process': 'off',
    'no-restricted-globals': 'off',

    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/no-explicit-any': 'off', // Allow any type for flexibility

    // Security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // Performance rules
    'no-await-in-loop': 'off', // Allow await in loops for certain use cases
    'prefer-const': 'error',
    'no-var': 'error',

    // Code quality rules - relaxed for modernization phase
    complexity: ['off'], // Disable complexity warnings
    'max-depth': ['off'], // Disable max depth warnings
    'max-lines-per-function': ['off'], // Disable function length warnings

    // Style rules - relaxed for modernization phase
    'antfu/if-newline': 'off',
    'eslint/no-unused-disable': 'off',
    'eslint-comments/no-unused-disable': 'off',
    'perfectionist/sort-imports': 'off',
    'perfectionist/sort-named-imports': 'off',
    'style/arrow-parens': 'off',
    'style/brace-style': 'off',
    'style/comma-dangle': 'off',
    'style/generator-star-spacing': 'off',
    'style/indent': 'off',
    'style/member-delimiter-style': 'off',
    'style/operator-linebreak': 'off',
    'style/quote-props': 'off',
    'style/quotes': 'off',
    'ts/consistent-type-imports': 'off',
  },
})
