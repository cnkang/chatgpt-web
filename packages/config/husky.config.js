// Shared Husky configuration for ChatGPT Web monorepo
export default {
  hooks: {
    'pre-commit': [
      'npx lint-staged',
      'echo "Running type check..."',
      'pnpm type-check',
      'echo "Pre-commit checks passed!"',
    ],
    'commit-msg': ['node --experimental-strip-types ./tools/validate-commit-msg.ts "$1"'],
  },
}
