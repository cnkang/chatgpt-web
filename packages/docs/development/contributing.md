# Contributing Guide

This guide reflects the current monorepo structure and scripts.

## Prerequisites

- Node.js `>= 24.0.0`
- pnpm `>= 10.0.0`
- Git

## Development Setup

From the repository root:

```bash
pnpm install
pnpm bootstrap

cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Minimum backend configuration (`apps/api/.env`):

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-official-api-key
DEFAULT_MODEL=gpt-4o
```

## Run the App Locally

Recommended daily command:

```bash
pnpm dev:core
```

Other options:

```bash
pnpm dev
pnpm dev:web
pnpm dev:api
```

## Before Opening a PR

Run the standard checks from the root:

```bash
pnpm quality
pnpm test
pnpm --filter @chatgpt-web/docs validate
```

## Conventional Commits

We follow Conventional Commits:

```text
<type>[optional scope]: <description>
```

Common types:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
