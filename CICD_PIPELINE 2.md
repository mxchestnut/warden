# CI/CD Pipeline Documentation

## Overview

Warden has a comprehensive CI/CD pipeline with multiple workflows for quality assurance, testing, and deployment.

## Workflows

### 1. PR Quality Checks (`pr-checks.yml`)

**Triggers:** Pull requests to `main` or `develop`

**Purpose:** Fast quality gates before running full test suite

**Jobs:**
- ✅ **Backend Quality** - ESLint + TypeScript type checking
- ✅ **Frontend Quality** - ESLint + TypeScript type checking  
- ✅ **Build Verification** - Ensures production builds work
- ✅ **Security Check** - npm audit for vulnerabilities
- ✅ **PR Summary** - Comments on PR with results

**Features:**
- Skips draft PRs automatically
- Cancels previous runs when new commits pushed
- Checks bundle size and warns if >5MB
- Fails fast on lint/type errors

**Example Output:**
```
🔍 PR Quality Checks

| Check | Status |
|-------|--------|
| Backend Quality | ✅ success |
| Frontend Quality | ✅ success |
| Build Verification | ✅ success |
| Security Audit | ✅ success |

✅ All checks passed! Ready to merge.
```

---

### 2. Test Suite (`tests.yml`)

**Triggers:** Push to `main`/`develop` or Pull requests

**Purpose:** Comprehensive testing with code coverage

**Jobs:**
- 🧪 **Backend Tests** - Unit & integration tests with Vitest
- 🎨 **Frontend Tests** - Component tests with React Testing Library
- 🎭 **E2E Tests** - Playwright browser automation
- 🔒 **Security Scan** - npm audit for both packages
- 📊 **Test Summary** - Comments results on PR

**Features:**
- PostgreSQL test database (service container)
- Code coverage uploaded to Codecov
- Playwright video recordings on failures
- Runs all tests in parallel
- Test artifacts retained for 30 days

---

### 3. Production Deployment (`deploy.yml`)

**Triggers:** 
- Push to `main` branch
- Manual workflow dispatch

**Purpose:** Deploy to production AWS EC2 server

**Jobs:**
- ✅ **Pre-Deploy Checks** - Lint, type check, build verification
- 🚀 **Deploy** - SSH to EC2, pull code, build, restart PM2
- 🏥 **Health Check** - Verify server is responding
- 💬 **Notifications** - Comment on commit with status

**Deployment Steps:**
1. Pull latest code from `main`
2. Install dependencies
3. Build backend and frontend
4. Restart PM2 process
5. Health check at `/health`
6. Verify production URL

**Environment:**
- Name: `production`
- URL: https://warden.my
- Health endpoint: https://warden.my/health
- API Docs: https://warden.my/api/docs

---

### 4. Staging Deployment (`deploy-staging.yml`)

**Triggers:**
- Push to `develop` branch
- Manual workflow dispatch

**Purpose:** Deploy to staging for QA testing

**Jobs:**
- 🏗️ **Build & Test** - Full test suite before deploy
- 🎭 **Deploy to Staging** - Deploy to staging server
- 🧪 **Smoke Tests** - Quick validation tests
- 💬 **PR Comment** - Notify when staging is ready

**Features:**
- Runs full test suite before deployment
- Separate staging database
- Smoke tests after deployment
- Comments on PR with staging URL

**Environment:**
- Name: `staging`
- URL: http://staging.warden.my (configure as needed)
- Port: 3001 (different from production)

---

### 5. Database Backup Testing (`backup-test.yml`)

**Triggers:** Monthly (1st of month at 3am)

**Purpose:** Verify database backups are working

**Jobs:**
- 🗄️ **Test Backup** - Create Neon branch from backup
- ✅ **Verify Data** - Run SQL queries to check data
- 📧 **Notifications** - Discord/Slack alerts on failure

---

## GitHub Secrets Required

### Production Deployment
```bash
AWS_HOST=54.235.52.122
AWS_USERNAME=ec2-user
AWS_SSH_KEY=<contents of warden-key-2026.pem>
```

### Staging Deployment (Optional)
```bash
STAGING_HOST=<staging server IP>
STAGING_USERNAME=ec2-user
STAGING_SSH_KEY=<staging SSH key>
STAGING_DATABASE_URL=<staging database URL>
```

### Testing
```bash
TEST_DATABASE_URL=<test database URL>
CODECOV_TOKEN=<optional - for coverage reports>
```

---

## Workflow Sequence

### For Pull Requests:

```
1. Developer creates PR
   ↓
2. pr-checks.yml runs (fast quality gates)
   - Lint backend
   - Lint frontend
   - Type check both
   - Build verification
   - Security audit
   ↓
3. tests.yml runs (comprehensive testing)
   - Backend unit tests
   - Frontend component tests
   - E2E tests
   - Code coverage
   ↓
4. PR comment shows results
   ↓
5. Developer merges when green
```

### For Production Deployment:

```
1. Merge PR to main
   ↓
2. deploy.yml triggers
   ↓
3. Pre-deployment checks
   - Lint
   - Type check
   - Build verification
   ↓
4. Deploy to AWS EC2
   - Pull code
   - Install deps
   - Build
   - Restart PM2
   ↓
5. Health check
   ↓
6. Commit comment with status
```

### For Staging (Optional):

```
1. Push to develop
   ↓
2. deploy-staging.yml triggers
   ↓
3. Build and test
   ↓
4. Deploy to staging
   ↓
5. Smoke tests
   ↓
6. Ready for QA
```

---

## Branch Protection Rules

Recommended GitHub branch protection for `main`:

- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass:
  - Backend Quality
  - Frontend Quality
  - Build Verification
  - Backend Tests
  - Frontend Tests
  - E2E Tests
- ✅ Require branches to be up to date
- ✅ Require signed commits (optional)
- ❌ Allow force pushes (disabled)
- ❌ Allow deletions (disabled)

---

## Environment Configuration

### GitHub Environments

**Production:**
- Required reviewers: 1 (optional)
- Deployment branch: `main` only
- Secrets: AWS credentials

**Staging:**
- Required reviewers: 0
- Deployment branch: `develop` only
- Secrets: Staging credentials

---

## Local Testing

### Test PR checks locally:

```bash
# Backend quality
cd backend
npm run lint
npx tsc --noEmit
npm run build

# Frontend quality
cd ../frontend-src
npm run lint
npx tsc --noEmit
npm run build
```

### Test full suite:

```bash
# Backend tests
cd backend
npm run test:coverage

# Frontend tests
cd ../frontend-src
npm run test:coverage

# E2E tests
cd ..
npm run test:e2e
```

---

## Monitoring & Alerts

### Deployment Notifications

- ✅ GitHub commit comments
- ✅ PR comments with test results
- ✅ Workflow status badges

### Future Enhancements:

- Discord webhooks for deployment status
- Slack notifications
- PagerDuty integration for failures
- Rollback automation

---

## Troubleshooting

### Build fails on CI but works locally

**Common causes:**
- Different Node versions (CI uses 22.x LTS)
- Missing environment variables
- Cache issues

**Solution:**
```bash
# Match CI environment locally
nvm use 22
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Tests pass locally but fail on CI

**Common causes:**
- Database connection issues
- Timing/race conditions
- File path differences (case sensitivity)

**Solution:**
- Check test database configuration
- Add delays in E2E tests
- Use cross-platform paths

### Deployment succeeds but site is down

**Common causes:**
- PM2 process crashed after restart
- Database connection failed
- Port conflict

**Solution:**
```bash
# SSH into server
ssh warden
pm2 logs warden-backend
pm2 status
curl http://localhost:3000/health
```

---

## Best Practices

### ✅ DO:
1. Run lint/tests locally before pushing
2. Keep PRs small and focused
3. Write meaningful commit messages
4. Add tests for new features
5. Update documentation
6. Review CI logs when builds fail

### ❌ DON'T:
1. Commit directly to `main`
2. Merge failing PRs
3. Skip code review
4. Push without testing
5. Ignore security alerts
6. Deploy on Fridays (if avoidable)

---

## Workflow Files Reference

| File | Purpose | Trigger |
|------|---------|---------|
| `pr-checks.yml` | Quality gates for PRs | Pull request |
| `tests.yml` | Comprehensive test suite | Push/PR |
| `deploy.yml` | Production deployment | Push to `main` |
| `deploy-staging.yml` | Staging deployment | Push to `develop` |
| `backup-test.yml` | Database backup verification | Monthly |

---

## Related Documentation

- [TESTING.md](../TESTING.md) - Testing framework details
- [DATABASE_BACKUP.md](../DATABASE_BACKUP.md) - Backup strategy
- [TECH_STACK.md](../TECH_STACK.md) - Technology overview
- [GitHub Actions Docs](https://docs.github.com/en/actions) - Official documentation
