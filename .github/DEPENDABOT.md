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

#### Auto-labeling and Comments (dependabot-auto-approve.yml)

- ✅ **Patch updates**: Auto-labeled as `auto-approve-ready` with informative comment
- 🔍 **Minor updates**: Labeled as `needs-review` with changelog reminder
- ⚠️ **Major updates**: Labeled as `breaking-change` with warning about potential issues

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

### Auto-labeling Not Working

1. Check workflow permissions in repository settings
2. Ensure Dependabot has access to create PRs
3. Verify workflow file syntax and triggers

### GitHub Actions Permission Errors

If you see "GitHub Actions is not permitted to approve pull requests":

- This is expected behavior with the default `GITHUB_TOKEN`
- The workflow uses labeling instead of approval for better compatibility
- Manually approve PRs labeled as `auto-approve-ready` after reviewing

## Related Links

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Configuration Options](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Auto-merge Best Practices](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/automating-dependabot-with-github-actions)
