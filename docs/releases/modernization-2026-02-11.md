# Modernization Notes

`2026-02-11`

This maintenance update modernizes runtime/tooling baselines and removes legacy dependencies where native platform capabilities are sufficient.

## Runtime and Tooling

- Standardized backend runtime scripts on Node.js native capabilities:
  - `--env-file-if-exists=.env`
  - `--watch`
  - `--experimental-strip-types`
- Enabled strict TypeScript mode for `service` and aligned build target to `node24`.
- Updated Docker images from Node 20 to Node 24 and switched to Corepack-managed pnpm.

## Dependency Modernization

- Upgraded key frontend dependencies to latest stable compatible versions (`vue`, `markdown-it`, `oxlint`).
- Removed redundant dependencies replaced by native/platform features:
  - root: `@vueuse/core`, `npm-run-all`, `autoprefixer`, `rimraf`
  - service: `dotenv`, `esno`, `rimraf`
- Migrated cleanup/build scripts to native Node.js filesystem APIs.

## Frontend Modernization

- Migrated Tailwind usage to v4 CSS-first style in `src/styles/lib/tailwind.css`:
  - `@import "tailwindcss"`
  - `@source`
  - `@theme`
  - `@custom-variant dark`
- Removed legacy `tailwind.config.js`.
- Applied Vue 3.5+ improvements (`useTemplateRef`) and streamlined chat streaming update logic.

## Quality and CI

- CI now installs root and `service` dependencies explicitly with pnpm cache.
- Added CI `test` job (`pnpm -r --if-present test`) and kept lint/type-check gates.
- Type-check now covers both frontend and backend via root `pnpm type-check`.
