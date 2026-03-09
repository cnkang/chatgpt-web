# @chatgpt-web/web

Vue.js frontend application for ChatGPT Web.

## Development

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

Rendering defaults:

- Markdown, KaTeX, and Mermaid are enabled in the standard build.
- `markstream-vue`'s D2 support is disabled by default to keep the frontend bundle lean and aligned with the documented product feature set.
- Set `VITE_APP_ENABLE_D2=true` only if you explicitly want to ship D2 support.

This package contains the frontend Vue.js application with modern monorepo architecture.
