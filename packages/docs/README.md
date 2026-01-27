# ChatGPT Web Documentation

This package contains all documentation for the ChatGPT Web monorepo project.

## Documentation Structure

- **[Setup](./setup/)** - Installation and initial setup guides
- **[Development](./development/)** - Development workflows and guidelines
- **[Deployment](./deployment/)** - Deployment guides and configurations
- **[API](./api/)** - API documentation and references
- **[Packages](./packages/)** - Package-specific documentation

## Quick Start

For new users, start with the [Monorepo Setup Guide](./setup/monorepo-setup.md).

## Contributing

When adding or updating documentation:

1. Follow the established directory structure
2. Use consistent markdown formatting
3. Update relevant index files
4. Test all links and references

## Validation

Run documentation validation:

```bash
pnpm --filter @chatgpt-web/docs validate
```

## Serving Documentation Locally

```bash
pnpm --filter @chatgpt-web/docs serve
```

Then visit http://localhost:8080 to browse the documentation.
