#!/bin/bash

# Safe push script that checks status before pushing
# Usage: ./scripts/safe-push.sh [commit message]

set -e

echo "🚀 Safe Push - Checking status before pushing..."
echo ""

# Run status check first
if ! ./scripts/check-status.sh; then
    echo ""
    echo "❌ Status check failed. Please fix the issues above before pushing."
    exit 1
fi

# If a commit message was provided and there are staged changes, commit them
if [ -n "$1" ] && ! git diff --cached --quiet; then
    echo ""
    echo "📝 Committing staged changes with message: $1"
    git commit -m "$1"
fi

# Push to main
echo ""
echo "📤 Pushing to origin/main..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "   Render will auto-deploy from the main branch."
    echo ""
    echo "📊 View deployment status at:"
    echo "   https://dashboard.render.com"
else
    echo ""
    echo "❌ Push failed. Please check the error above."
    exit 1
fi
