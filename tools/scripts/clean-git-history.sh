#!/bin/bash

# Git History Cleanup Script
# This script removes sensitive files from git history using git-filter-repo

echo "🚨 WARNING: This will rewrite git history!"
echo "🚨 All commit SHAs will change!"
echo "🚨 If this repo is shared, collaborators will need to re-clone!"
echo ""
echo "Files to be removed from history:"
echo "- .env (environment variables)"
echo "- .turbo/ directories (cache files)"
echo "- dist/ directories (build outputs)"
echo "- *.log files (log files)"
echo ""

read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Operation cancelled"
    exit 1
fi

echo "📦 Creating backup..."
cd ..
cp -r chatgpt-web chatgpt-web-backup-$(date +%Y%m%d-%H%M%S)
cd chatgpt-web

echo "🧹 Cleaning git history..."

# Remove .env files from history
git filter-repo --path .env --invert-paths --force

# Remove .turbo directories from history  
git filter-repo --path-glob '*/.turbo' --invert-paths --force

# Remove dist directories from history
git filter-repo --path-glob '*/dist' --invert-paths --force

# Remove log files from history
git filter-repo --path-glob '*.log' --invert-paths --force

echo "✅ Git history cleaned!"
echo "📊 Repository statistics:"
git count-objects -v

echo ""
echo "🔄 Next steps:"
echo "1. Verify the repository is working correctly"
echo "2. If you have a remote repository, you'll need to force push:"
echo "   git remote add origin <your-repo-url>"
echo "   git push --force-with-lease --all"
echo "   git push --force-with-lease --tags"
echo "3. Inform collaborators to re-clone the repository"