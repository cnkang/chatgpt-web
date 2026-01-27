# Contributing Guide

Thanks for contributing to ChatGPT Web. This guide reflects the current monorepo layout.

## Repository and Prerequisites

- Repository: https://github.com/cnkang/chatgpt-web
- Node.js: `>= 24.0.0`
- pnpm: `>= 10.0.0`

## Local Setup

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

## Development Commands

Recommended daily workflow:

```bash
pnpm dev:core
```

Useful checks before opening a PR:

```bash
pnpm quality
pnpm test
pnpm --filter @chatgpt-web/docs validate
```

## Pull Requests

1. Fork the repo and create a branch from `main`.
2. Make focused changes with clear commit messages.
3. Run quality checks and tests.
4. Open a PR and link any related issues.

## Commit Guidelines (Conventional Commits)

We follow Conventional Commits:

```bash
<type>[optional scope]: <description>
```

Common types:

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation change
- `refactor`: refactoring without behavior change
- `test`: tests
- `chore`: maintenance
