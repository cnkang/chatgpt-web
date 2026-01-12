# @chatgpt-web/config

Shared configuration files for the ChatGPT Web monorepo.

## Exports

- `eslint` - ESLint configuration
- `prettier` - Prettier configuration
- `typescript` - Base TypeScript configuration
- `tsup` - Build configuration
- `vitest` - Test configuration

## Usage

```javascript
// eslint.config.js
import config from '@chatgpt-web/config/eslint'
export default config

// tsconfig.json
{
  "extends": "@chatgpt-web/config/typescript"
}
```
