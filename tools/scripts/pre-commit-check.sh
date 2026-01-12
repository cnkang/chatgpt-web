#!/bin/bash

# Pre-commit validation script
# Checks for files that shouldn't be committed

echo "🔍 Checking for files that shouldn't be committed..."

# Check for common files that should be ignored
PROBLEMATIC_FILES=$(git diff --cached --name-only | grep -E "(node_modules|\.log$|\.DS_Store|dist/|build/|coverage/|\.cache/|\.turbo/cache|\.serena/cache)")

if [ ! -z "$PROBLEMATIC_FILES" ]; then
    echo "❌ Found files that shouldn't be committed:"
    echo "$PROBLEMATIC_FILES"
    echo ""
    echo "Please remove these files from staging:"
    echo "git reset HEAD $PROBLEMATIC_FILES"
    exit 1
fi

# Check for large files (>1MB)
LARGE_FILES=$(git diff --cached --name-only | xargs -I {} sh -c 'if [ -f "{}" ] && [ $(stat -f%z "{}" 2>/dev/null || stat -c%s "{}" 2>/dev/null || echo 0) -gt 1048576 ]; then echo "{}"; fi')

if [ ! -z "$LARGE_FILES" ]; then
    echo "⚠️  Found large files (>1MB):"
    echo "$LARGE_FILES"
    echo ""
    echo "Consider if these files should be committed or added to .gitignore"
fi

# Check for environment files
ENV_FILES=$(git diff --cached --name-only | grep -E "\.env$|\.env\..*")

if [ ! -z "$ENV_FILES" ]; then
    echo "❌ Found environment files that shouldn't be committed:"
    echo "$ENV_FILES"
    echo ""
    echo "Please remove these files from staging:"
    echo "git reset HEAD $ENV_FILES"
    exit 1
fi

# Check commit message format (if available)
if [ ! -z "$1" ]; then
    COMMIT_MSG="$1"
    if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|ci|perf|build|revert)(\(.+\))?: .+"; then
        echo "❌ Commit message doesn't follow Conventional Commits format"
        echo "Expected: type(scope): description"
        echo "Examples:"
        echo "  feat: add new feature"
        echo "  fix: resolve login issue"
        echo "  docs: update README"
        exit 1
    fi
fi

echo "✅ All checks passed!"