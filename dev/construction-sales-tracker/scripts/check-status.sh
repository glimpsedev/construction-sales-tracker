#!/bin/bash

# Script to check git status before pushing/deploying
# Usage: ./scripts/check-status.sh

echo "🔍 Checking git status..."
echo ""

# Check if we're on the main branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
    echo "⚠️  You're on branch: $current_branch (not main)"
    echo ""
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ UNCOMMITTED CHANGES DETECTED:"
    echo ""
    echo "Modified files:"
    git diff --name-only HEAD
    echo ""
    echo "📝 To commit these changes:"
    echo "   git add <files>"
    echo "   git commit -m 'Your commit message'"
    echo ""
    exit 1
else
    echo "✅ No uncommitted changes"
fi

# Check if local is ahead of remote
local_commits=$(git rev-list origin/main..HEAD 2>/dev/null | wc -l | tr -d ' ')
if [ "$local_commits" -gt 0 ]; then
    echo "⚠️  You have $local_commits local commit(s) not pushed to remote"
    echo "   Run 'git push origin main' to push them"
    echo ""
else
    echo "✅ All commits are pushed to remote"
fi

# Check if remote is ahead of local
remote_commits=$(git rev-list HEAD..origin/main 2>/dev/null | wc -l | tr -d ' ')
if [ "$remote_commits" -gt 0 ]; then
    echo "⚠️  Remote has $remote_commits commit(s) you don't have locally"
    echo "   Run 'git pull origin main' to sync"
    echo ""
else
    echo "✅ Local is up to date with remote"
fi

echo ""
echo "✅ Status check complete - ready to deploy!"
