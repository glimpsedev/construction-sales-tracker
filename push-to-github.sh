#!/bin/bash

# Push to GitHub using the secure token from environment variable
echo "Pushing to GitHub..."
git push https://glimpsedev:${GITHUB_TOKEN}@github.com/glimpsedev/construction-sales-tracker.git main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo "View your repository at: https://github.com/glimpsedev/construction-sales-tracker"
else
    echo "❌ Push failed. Please check your token permissions."
fi