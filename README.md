# React + TypeScript + Vite + shadcn/ui


# Git Workflow Guidelines

This repository follows a simple branching strategy to enable parallel development while keeping the `main` branch stable.

--------------------------------------------------

BRANCH STRUCTURE

The project uses the following branch types:

main  
Stable production-ready code.  
Only merged by Noah.

dev-noah  
Development branch for smaller changes by Noah.

dev-maxi  
Development branch for smaller changes by Maxi.

feature/...  
Temporary branches for larger features or significant changes.

--------------------------------------------------

DEVELOPMENT WORKFLOW

1. Small Changes

Small changes include:
- minor bug fixes
- small UI adjustments
- small refactorings
- documentation updates

These changes should be committed directly to your personal dev branch.

Example:
Noah → dev-noah  
Maxi → dev-maxi

Example workflow:

git checkout dev-noah
git pull origin dev-noah

# make changes

git add .
git commit -m "Fix button alignment"
git push

--------------------------------------------------

2. Larger Features or Changes

For larger features or structural changes, create a dedicated feature branch.

Examples:

feature/login-system
feature/payment-integration
feature/user-settings

Create the branch from main:

git checkout main
git pull origin main
git checkout -b feature/feature-name

Work normally and push the branch:

git add .
git commit -m "Implement login flow"
git push -u origin feature/feature-name

--------------------------------------------------

3. Merging

All merges into main are handled by Noah.

Typical flow:

1. Development happens in:
   - dev-noah
   - dev-maxi
   - feature/... branches

2. Once changes are ready, they are reviewed.

3. Noah merges the changes into main.

This ensures:
- a stable main branch
- consistent code quality
- controlled integration of features

--------------------------------------------------

4. General Rules

- Never push directly to main
- Keep commits small and descriptive
- Pull the latest changes regularly
- Use feature branches for larger work
- Delete feature branches after merging

Good commit message examples:

Add login form validation  
Fix API error handling  
Improve mobile layout for dashboard  
Refactor authentication service

--------------------------------------------------

SUMMARY

Type of Work → Branch

Small fixes / minor changes → dev-noah / dev-maxi  
Larger features → feature/...  
Stable code → main  
Merge responsibility → Noah
