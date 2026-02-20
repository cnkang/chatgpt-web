# @chatgpt-web/config

Shared configuration files for the ChatGPT Web monorepo.

Linting is configured via the repository root `biome.json`.

## Exports

- `prettier` - Prettier configuration
- `typescript` - Base TypeScript configuration
- `tsup` - Build configuration
- `vitest` - Test configuration

## Usage

```json
// tsconfig.json
{
  "extends": "@chatgpt-web/config/typescript"
}
```
