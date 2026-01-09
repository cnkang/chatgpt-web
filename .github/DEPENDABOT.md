# Dependabot Configuration Guide

This project has been configured with Dependabot automatic dependency updates to ensure project dependencies stay current and secure.

## Configuration Overview

### Update Schedule

- **npm dependencies**: Daily checks (02:00 Asia/Shanghai)
- **GitHub Actions**: Weekly checks on Monday (02:00 Asia/Shanghai)
- **Docker**: Weekly checks on Sunday (02:00 Asia/Shanghai)

### Dependency Grouping

To reduce PR volume and improve management efficiency, related dependencies are grouped for updates:

- **Vue ecosystem**: Vue-related packages
- **Build tools**: Vite, Rollup, and other build tools
- **ESLint ecosystem**: ESLint-related packages
- **TypeScript ecosystem**: TypeScript and type definitions
- **CSS tools**: Tailwind CSS, PostCSS, etc.
- **Development tools**: Husky, Prettier, and other dev tools

### Automation Workflows

#### Auto-approve (dependabot-auto-approve.yml)

- ✅ **Patch updates**: Auto-approved (e.g., 1.0.0 → 1.0.1)
- 🔍 **Minor updates**: Review reminder added (e.g., 1.0.0 → 1.1.0)
- ⚠️ **Major updates**: Warning labels added (e.g., 1.0.0 → 2.0.0)

#### Auto-merge (dependabot-auto-merge.yml) - Optional

- Auto-merge patch and minor updates only after CI checks pass
- Major updates require manual review

## Security Considerations

### Ignored Updates

Major version updates for the following dependencies are ignored and require manual handling:

- Vue
- TypeScript
- ESLint

### PR Limits

- npm dependencies: Maximum 10 open PRs
- GitHub Actions: Maximum 5 open PRs
- Docker: Maximum 3 open PRs

## Manual Operations

### Trigger Immediate Check

```bash
# Trigger Dependabot check via GitHub CLI
gh api repos/:owner/:repo/dependabot/updates -f package_ecosystem=npm
```

### Ignore Specific Updates

Comment the following commands in PRs:

```
@dependabot ignore this major version
@dependabot ignore this minor version
@dependabot ignore this dependency
```

### Recreate PR

```
@dependabot recreate
```

## Best Practices

1. **Regular Review**: Even auto-approved updates should be periodically checked
2. **Test Coverage**: Ensure sufficient test coverage to catch potential issues
3. **Staged Deployment**: Important updates should be validated in test environments first
4. **Monitoring**: Monitor application performance and error rates after deployment

## Troubleshooting

### Dependabot Not Creating PRs

1. Check `.github/dependabot.yml` syntax
2. Confirm Dependabot is enabled in repository settings
3. View Dependabot logs: Settings → Security → Dependabot

### Auto-merge Failures

1. Check CI status
2. Verify branch protection rules
3. Validate GitHub Token permissions

## Related Links

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Configuration Options](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Auto-merge Best Practices](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/automating-dependabot-with-github-actions)
