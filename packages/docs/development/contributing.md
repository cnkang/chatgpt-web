# Contributing Guide

Thank you for your interest in contributing to ChatGPT Web! This guide will help you get started with contributing to the project.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 24.0.0+** (LTS recommended)
- **pnpm 10.27.0+** (package manager)
- **Git** (version control)

### Development Setup

1. **Fork and Clone**

   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/chatgpt-web.git
   cd chatgpt-web
   ```

2. **Install Dependencies**

   ```bash
   # Install root dependencies
   pnpm install

   # Install service dependencies
   cd service
   pnpm install
   cd ..
   ```

3. **Environment Configuration**

   ```bash
   # Copy environment template
   cp .env.example .env
   cp service/.env.example service/.env

   # Edit .env files with your configuration
   # At minimum, set OPENAI_API_KEY in service/.env
   ```

4. **Verify Setup**

   ```bash
   # Run type checking
   pnpm type-check

   # Run linting
   pnpm lint

   # Run tests
   cd service && pnpm test
   ```

## Development Workflow

### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: New features (`feature/add-reasoning-models`)
- **fix/**: Bug fixes (`fix/memory-leak-in-chat`)
- **docs/**: Documentation updates (`docs/update-api-guide`)

### Creating a Feature Branch

```bash
# Create and switch to a new feature branch
git checkout -b feature/your-feature-name

# Make your changes
# ...

# Commit your changes
git add .
git commit -m "feat: add your feature description"

# Push to your fork
git push origin feature/your-feature-name
```

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

#### Examples

```bash
# Feature addition
git commit -m "feat(chat): add support for reasoning models"

# Bug fix
git commit -m "fix(api): resolve memory leak in message processing"

# Documentation
git commit -m "docs(setup): update installation instructions"

# Breaking change
git commit -m "feat(api)!: change response format for chat completions

BREAKING CHANGE: The response format has changed from { message } to { data: { message } }"
```

## Code Standards

### TypeScript

- Use strict TypeScript configuration
- Zero errors policy
- Explicit type annotations for public APIs

```typescript
// ✅ Good
interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
}

export function formatMessage(message: ChatMessage): string {
  return `[${message.role}] ${message.content}`
}

// ❌ Bad
export function formatMessage(message: any) {
  return `[${message.role}] ${message.content}`
}
```

### Vue.js Components

- Use Composition API with `<script setup>`
- Explicit prop types
- Proper event typing

```vue
<script setup lang="ts">
interface Props {
  message: ChatMessage
  loading?: boolean
}

interface Emits {
  send: [content: string]
  delete: [id: string]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<Emits>()
</script>
```

### Code Style

- Follow ESLint configuration (`@antfu/eslint-config`)
- Use Prettier for formatting
- Zero warnings policy

```bash
# Check code style
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Format code
pnpm format
```

## Testing Requirements

### Test Coverage

All contributions must include appropriate tests:

- **New Features**: Unit tests + integration tests
- **Bug Fixes**: Regression tests
- **Refactoring**: Maintain existing test coverage

### Running Tests

```bash
# Backend tests
cd service
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# Property-based tests
pnpm test:property
```

### Writing Tests

```typescript
// Unit test example
describe('ChatService', () => {
  it('should format messages correctly', () => {
    const message = {
      id: '1',
      content: 'Hello',
      role: 'user' as const,
      timestamp: new Date(),
    }

    const result = formatMessage(message)
    expect(result).toBe('[user] Hello')
  })
})

// Integration test example
describe('Chat API', () => {
  it('should handle chat completion', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o',
      })
      .expect(200)

    expect(response.body.message.role).toBe('assistant')
  })
})
```

## Pull Request Process

### Before Submitting

1. **Update Documentation**
   - Update relevant README files
   - Add/update API documentation
   - Update CHANGELOG.md

2. **Run Quality Checks**

   ```bash
   # Type checking
   pnpm type-check

   # Linting
   pnpm lint

   # Tests
   cd service && pnpm test

   # Build verification
   pnpm build
   ```

3. **Test Your Changes**
   - Test locally with different configurations
   - Verify both OpenAI and Azure OpenAI providers
   - Test edge cases and error scenarios

### Pull Request Template

```markdown
## Description

Brief description of the changes made.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Property-based tests added (if applicable)

## Checklist

- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Code is commented, particularly in hard-to-understand areas
- [ ] Corresponding changes to documentation made
- [ ] Changes generate no new warnings
- [ ] Tests added that prove the fix is effective or feature works
- [ ] New and existing unit tests pass locally
```

### Review Process

1. **Automated Checks**
   - CI/CD pipeline runs automatically
   - All checks must pass before review

2. **Code Review**
   - At least one maintainer review required
   - Address all feedback before merging

3. **Testing**
   - Manual testing by reviewers
   - Verification of edge cases

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Environment:**

- OS: [e.g. macOS, Windows, Linux]
- Node.js version: [e.g. 24.12.0]
- Browser: [e.g. Chrome, Firefox]
- Version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## Documentation

### Documentation Standards

- Use clear, concise language
- Include code examples
- Update relevant sections when making changes
- Follow existing documentation structure

### API Documentation

````typescript
/**
 * Sends a chat message to the AI provider
 *
 * @param messages - Array of chat messages
 * @param options - Configuration options
 * @returns Promise resolving to AI response
 *
 * @example
 * ```typescript
 * const response = await sendMessage([
 *   { role: 'user', content: 'Hello' }
 * ], { model: 'gpt-4o' })
 * ```
 */
export async function sendMessage(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResponse> {
  // Implementation
}
````

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Changelog

Update `CHANGELOG.md` with your changes:

```markdown
## [Unreleased]

### Added

- New reasoning models support
- Enhanced error handling

### Changed

- Updated dependencies to latest versions

### Fixed

- Memory leak in chat processing
- Rate limiting edge cases

### Deprecated

- Legacy API endpoints (will be removed in v2.0.0)
```

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain a professional tone

### Communication

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **Pull Requests**: Code contributions

### Getting Help

- Check existing issues and documentation first
- Provide detailed information when asking questions
- Be patient and respectful when seeking help

## Recognition

Contributors are recognized in:

- `CONTRIBUTORS.md` file
- Release notes for significant contributions
- GitHub contributor statistics

Thank you for contributing to ChatGPT Web! Your contributions help make this project better for everyone.
