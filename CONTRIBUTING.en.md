# Contribution Guide

Thank you for contributing to this project.

## Branch and Pull Request

1. Fork [cnkang/chatgpt-web](https://github.com/cnkang/chatgpt-web) and create your branch from `main`.
2. Keep your changes focused and submit a pull request to `main`.
3. Link related issues in your PR description when applicable.

## Local Setup

```bash
nvm install
nvm use
corepack enable
corepack prepare pnpm@10.29.2 --activate
pnpm bootstrap
pnpm --dir service install
```

## Development Commands

```bash
# Frontend
pnpm dev

# Backend (Node.js native watch + env-file + strip-types)
pnpm --dir service dev
```

## Quality Gates

Run these checks before opening a PR:

```bash
pnpm lint
pnpm type-check
pnpm -r --if-present test
pnpm secrets:scan
```

If backend changes are included, also verify production build:

```bash
pnpm --dir service build
```

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>[optional scope]: <description>
```

Common types:

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation changes
- `refactor`: code refactor
- `perf`: performance improvement
- `test`: tests
- `chore`: tooling/maintenance

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
