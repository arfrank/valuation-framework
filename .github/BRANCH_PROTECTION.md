# Branch Protection Setup

To ensure code quality and prevent breaking changes, set up branch protection rules for your main branch.

## Recommended Settings

### 1. Navigate to Branch Protection
1. Go to your repository on GitHub
2. Click **Settings** → **Branches**
3. Click **Add rule** or edit existing rule for `main`/`master`

### 2. Configure Protection Rules

#### ✅ Required Status Checks
Enable these checks before merging:
- `test (20.x)` - Tests on Node.js 20
- `test (22.x)` - Tests on Node.js 22
- `test (24.x)` - Tests on Node.js 24
- `quality` - Code quality and linting
- `security` - Security audit

#### ✅ Require Pull Request Reviews
- **Required approving reviews:** 1 (or more for larger teams)
- **Dismiss stale reviews:** ✅ Enabled
- **Require review from CODEOWNERS:** ✅ Enabled (if you have CODEOWNERS file)

#### ✅ Additional Settings
- **Require branches to be up to date:** ✅ Enabled
- **Require conversation resolution:** ✅ Enabled  
- **Include administrators:** ✅ Enabled (recommended)
- **Allow force pushes:** ❌ Disabled
- **Allow deletions:** ❌ Disabled

## Branch Protection Example

```yaml
# Example configuration (via GitHub API or UI)
protection:
  required_status_checks:
    strict: true
    checks:
      - "test (20.x)"
      - "test (22.x)"
      - "test (24.x)"
      - "quality"
      - "security"
  
  required_pull_request_reviews:
    required_approving_review_count: 1
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
  
  enforce_admins: true
  allow_force_pushes: false
  allow_deletions: false
```

## CODEOWNERS File (Optional)

Create `.github/CODEOWNERS` to automatically request reviews:

```
# Global owners
* @your-username

# Specific paths
/react-app/src/utils/multiPartyCalculations.js @math-expert @your-username
/.github/workflows/ @devops-expert @your-username
```

## Benefits

With these settings:
- 🛡️ **No direct pushes** to main branch
- 🔍 **All code reviewed** before merging
- ✅ **Tests must pass** before merge
- 🚫 **Known bugs tracked** but don't block development
- 📈 **Code quality maintained** through linting
- 🔒 **Security checked** on every change

## Emergency Override

For critical hotfixes, repository administrators can still merge with:
- Override protection rules (use sparingly)
- Create emergency branch and fast-track review
- Merge with admin privileges if absolutely necessary

Remember: These protections help maintain code quality but shouldn't block legitimate development work.