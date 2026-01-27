# Deployment Guide

## Preventing Uncommitted Changes from Being Deployed

To ensure all your changes are committed and pushed before deployment, we've set up several safeguards:

### 1. Git Pre-Push Hook (Automatic)

A pre-push hook automatically checks for uncommitted changes before you push. If you have uncommitted changes, it will:
- Show you which files are modified
- Ask if you want to continue anyway
- Prevent accidental pushes with uncommitted work

**This hook runs automatically** - you don't need to do anything!

### 2. Status Check Script

Before pushing or deploying, run:

```bash
npm run status
# or
./scripts/check-status.sh
```

This will check:
- ✅ If you have uncommitted changes
- ✅ If your local commits are pushed to remote
- ✅ If remote has commits you don't have locally

### 3. Safe Push Script

Use the safe push script to automatically check status before pushing:

```bash
npm run push "Your commit message"
# or
./scripts/safe-push.sh "Your commit message"
```

This will:
1. Check for uncommitted changes
2. Commit staged changes (if a message is provided)
3. Push to GitHub
4. Confirm Render will auto-deploy

### 4. Recommended Workflow

**Before making changes:**
```bash
# Check current status
npm run status
```

**After making changes:**
```bash
# Stage your changes
git add <files>

# Commit with a message
git commit -m "Description of changes"

# Push safely (checks status first)
npm run push
```

**Or use the safe push script:**
```bash
# Stage files, then:
npm run push "Description of changes"
```

### 5. Manual Check Before Deployment

Always run a status check before assuming changes are deployed:

```bash
npm run status
```

If everything is ✅, your changes should be deploying to Render automatically.

### Troubleshooting

**If changes aren't showing up live:**

1. Check git status:
   ```bash
   git status
   ```

2. Check if changes are committed:
   ```bash
   git log --oneline -5
   ```

3. Check if changes are pushed:
   ```bash
   git log origin/main..HEAD
   ```

4. Check Render dashboard for deployment status:
   - https://dashboard.render.com

**Common issues:**
- ❌ Uncommitted changes → Commit them first
- ❌ Unpushed commits → Push with `git push origin main`
- ❌ Deployment failed → Check Render logs
- ❌ Browser cache → Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
