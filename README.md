# ChatGPT Web

> Disclaimer: This project is open-source, published on GitHub, and released under the MIT License. Please avoid paid reselling or unofficial paid support groups.

[中文文档](./README.zh.md)

![cover](./docs/c1.png)
![cover2](./docs/c2.png)

## Overview

A full-stack ChatGPT web client built with `Vue 3 + Vite` (frontend) and `Express + TypeScript` (service).
Latest release: `v3.0.1` (`2026-02-10`, republished to latest commit).

The project supports two runtime modes through the `chatgpt` package:

- `OPENAI_API_KEY` mode (`ChatGPTAPI`)
- `OPENAI_ACCESS_TOKEN` mode (`ChatGPTUnofficialProxyAPI`)

## Current Features

- Multi-session chat history and context continuation
- Markdown / code rendering, KaTeX formula rendering, Mermaid support
- Import/export conversations and export messages as image
- Multi-language UI and theme switching
- Auth key protection (`AUTH_SECRET_KEY`) and request rate limiting
- Security defaults for production (`AUTH_REQUIRED_IN_PRODUCTION`, CORS allowlist)

## Repository Layout

- `src/`: frontend app (Vue 3 + Vite)
- `service/`: backend service (Express + TypeScript)
- `docker-compose/`: compose deployment example
- `kubernetes/`: Kubernetes deployment manifests
- `docs/releases/`: release notes

## Maintainer

- Current maintainer: `Kang` (no direct contact information is published in this repository)
- Original project author: [ChenZhaoYu](https://github.com/Chanzhaoyu)

## Requirements

- Node.js: `24 (LTS)` via `nvm` (`.nvmrc`)
- PNPM: `10.x` (matches `packageManager`)

## Quick Start

### 1) Use required runtime

```bash
nvm install
nvm use
corepack enable
corepack prepare pnpm@10.29.2 --activate
```

### 2) Install dependencies

```bash
pnpm bootstrap
pnpm --dir service install
```

### 3) Configure backend env

```bash
cp service/.env.example service/.env
```

At least one of the following must be configured in `service/.env`:

- `OPENAI_API_KEY`
- `OPENAI_ACCESS_TOKEN`

### 4) Configure frontend env (recommended)

Create `.env.local` in repository root:

```bash
VITE_GLOB_API_URL=/api
VITE_APP_API_BASE_URL=http://127.0.0.1:3002
VITE_GLOB_OPEN_LONG_REPLY=false
VITE_GLOB_APP_PWA=false
```

### 5) Start services

Terminal A (backend):

```bash
pnpm --dir service dev
```

Terminal B (frontend):

```bash
pnpm dev
```

Default local access:

- Frontend: `http://127.0.0.1:1002`
- Backend health: `http://127.0.0.1:3002/health`

## Backend Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | One of two | OpenAI API key |
| `OPENAI_ACCESS_TOKEN` | One of two | Access token mode |
| `OPENAI_API_BASE_URL` | Optional | Custom OpenAI-compatible base URL |
| `OPENAI_API_MODEL` | Optional | Model name |
| `OPENAI_API_DISABLE_DEBUG` | Optional | Set `false` to enable API debug logs |
| `API_REVERSE_PROXY` | Optional | Reverse proxy URL for access-token mode |
| `TIMEOUT_MS` | Optional | Request timeout in milliseconds |
| `MAX_REQUEST_PER_HOUR` | Optional | Per-IP request rate limit (`0` disables limit) |
| `MAX_VERIFY_PER_HOUR` | Optional | Per-IP verify endpoint rate limit (`0` disables limit) |
| `AUTH_SECRET_KEY` | Optional | Bearer token required by protected endpoints |
| `AUTH_REQUIRED_IN_PRODUCTION` | Optional | Defaults to `true`; requires `AUTH_SECRET_KEY` in production |
| `CORS_ALLOW_ORIGIN` | Optional | Comma-separated CORS allowlist |
| `SOCKS_PROXY_HOST` / `SOCKS_PROXY_PORT` | Optional | SOCKS proxy host and port (must be used together) |
| `SOCKS_PROXY_USERNAME` / `SOCKS_PROXY_PASSWORD` | Optional | SOCKS proxy credentials |
| `HTTPS_PROXY` | Optional | HTTPS proxy URL |
| `ALL_PROXY` | Optional | Fallback proxy URL |

## Frontend Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_GLOB_API_URL` | Recommended | API prefix used by browser requests (typically `/api`) |
| `VITE_APP_API_BASE_URL` | Recommended for dev | Vite dev server proxy target |
| `VITE_GLOB_OPEN_LONG_REPLY` | Optional | Auto-continue long replies when model returns `length` |
| `VITE_GLOB_APP_PWA` | Optional | Enable/disable PWA build |

## Build

```bash
pnpm build
pnpm --dir service build
```

Run production backend:

```bash
pnpm --dir service prod
```

## Deployment

### Docker

```bash
docker build -t chatgpt-web .
docker run --name chatgpt-web --rm -it -p 3002:3002 --env-file service/.env chatgpt-web
```

### Docker Compose

See: [docker-compose/README.md](./docker-compose/README.md)

### Kubernetes

See: [kubernetes/README.md](./kubernetes/README.md)

## Quality Checks

```bash
pnpm lint
pnpm type-check
pnpm secrets:scan
```

## Contributing

Please read [CONTRIBUTING.en.md](./CONTRIBUTING.en.md) before submitting PRs.

## Acknowledgements

Special tribute to [ChenZhaoYu](https://github.com/Chanzhaoyu), the original author of this project and its open-source foundation.

Thanks to [JetBrains](https://www.jetbrains.com/) for supporting open-source development.

Thanks to all contributors:

<a href="https://github.com/cnkang/chatgpt-web/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=cnkang/chatgpt-web" alt="Contributors" />
</a>

## License

MIT License. See [LICENSE](./LICENSE).
