# `@chatgpt-web/config`

This package contains shared tooling configuration for the monorepo. It is not an application runtime config system.

## What It Provides

Key files in `packages/config/`:

- `eslint.config.js`
- `prettier.config.js`
- `tsconfig.base.json`
- `tsup.config.ts`
- `vitest.config.ts`
- `husky.config.js`
- VS Code workspace/settings helpers:
  - `chatgpt-web.code-workspace`
  - `vscode-settings.json`
  - `vscode-extensions.json`
  - `vscode-launch.json`

## Typical Usage

### ESLint

```ts
// eslint.config.js
import config from '@chatgpt-web/config/eslint'
export default config
```

### TypeScript

```json
{
  "extends": "@chatgpt-web/config/typescript"
}
```

### Vitest

```ts
// vitest.config.ts
import config from '@chatgpt-web/config/vitest'
export default config
```

## Notes

- Runtime environment variables are documented in:
  - `apps/api/.env.example`
  - `packages/docs/setup/environment-configuration.md`
  - `packages/docs/deployment/environment.md`
