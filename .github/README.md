# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated testing, quality checks, and deployment.

## Workflows

### 🧪 `test.yml` - Main Test Workflow
Runs on every push to main/master and all pull requests.

**What it does:**
- Tests on Node.js 18.x and 20.x
- Installs dependencies with `npm ci`
- Runs ESLint for code quality
- Executes the full test suite with coverage
- Builds the project to ensure it compiles
- Uploads coverage reports to Codecov (optional)

**Triggers:**
- Push to `main` or `master` branch
- Pull requests targeting `main` or `master`
- Manual trigger via GitHub UI

### 🔍 `pr-checks.yml` - Pull Request Quality Checks
Specialized checks for pull requests with focus on known issues.

**What it does:**
- **Critical Tests**: Runs mathematical consistency tests to track known bugs
- **Quality Checks**: Linting, build verification, bundle size monitoring  
- **Security Checks**: npm audit and sensitive data detection

**Features:**
- ⚠️ Warns about known critical bugs without blocking PRs
- 📦 Monitors bundle size (alerts if >5MB)
- 🔒 Scans for potential secrets in source code
- 🛡️ Runs security audit on dependencies

### 🚀 `deploy.yml` - Production Deployment
Handles deployment to production after tests pass.

**What it does:**
- Runs full test suite before deployment
- Builds production artifacts
- Uploads artifacts for 30-day retention
- Supports multiple deployment targets (configure as needed)

**Deployment Options** (uncomment in the file):
- Vercel
- Netlify  
- GitHub Pages

## Setup Instructions

### 1. Install Dependencies
```bash
cd react-app
npm install
```

### 2. Configure Secrets (Optional)
In your GitHub repository settings, add these secrets for enhanced features:

- `CODECOV_TOKEN` - For coverage reporting
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` - For Vercel deployment
- `NETLIFY_SITE_ID`, `NETLIFY_AUTH_TOKEN` - For Netlify deployment

### 3. Customize Deployment
Edit `deploy.yml` to uncomment and configure your preferred deployment method.

## Available npm Scripts

```bash
# Development
npm run dev              # Start development server
npm run preview         # Preview production build

# Testing  
npm test                # Run tests in watch mode
npm run test:run        # Run tests once
npm run test:coverage   # Run tests with coverage report
npm run test:ui         # Run tests with UI

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Run ESLint with auto-fix

# Building
npm run build          # Build for production
```

## Test Coverage

The workflows generate test coverage reports. Currently tracking:
- ✅ **149 passing tests** 
- ❌ **4 failing tests** (known mathematical consistency bugs)
- 📊 Coverage reports uploaded to Codecov

## Known Issues Being Tracked

The PR checks specifically monitor these critical bugs:
1. **Ownership percentages don't sum to 100%** (mathematical consistency)
2. **SAFE calculations with extreme values** (1000%+ ownership)
3. **Pro-rata round size inconsistencies**

These tests are included to ensure regressions don't occur while fixes are developed.

## Status Badges

Add these to your main README.md:

```markdown
![Tests](https://github.com/your-username/valuation-framework/workflows/Run%20Tests/badge.svg)
![PR Checks](https://github.com/your-username/valuation-framework/workflows/Pull%20Request%20Checks/badge.svg)
```

## Troubleshooting

**Tests failing locally but passing in CI?**
- Ensure you're using the same Node.js version (18.x or 20.x)
- Run `npm ci` instead of `npm install`
- Check for platform-specific issues

**Coverage upload failing?**
- Codecov token might be missing or invalid
- Coverage is optional and won't fail the build

**Deployment not working?**
- Check that secrets are configured correctly
- Verify the deployment service configuration
- Review the deployment provider's documentation