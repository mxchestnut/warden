# Database Backup Setup - Quick Start Guide

## ✅ What's Been Set Up

Your database backup strategy is now configured with:

1. ✅ **Comprehensive Documentation** - [DATABASE_BACKUP.md](DATABASE_BACKUP.md)
2. ✅ **Automated Test Script** - `scripts/test-backup-restore.sh`
3. ✅ **Verification Queries** - `scripts/verify-backup-data.sql`
4. ✅ **Monthly Automated Testing** - `.github/workflows/backup-test.yml`
5. ✅ **Test Logging** - `logs/backup-tests.log`

---

## 🚀 Next Steps to Complete Setup

### Step 1: Install Neon CLI (Required)

```bash
# Install globally
npm install -g neonctl

# Authenticate with your Neon account
neonctl auth
```

### Step 2: Add GitHub Secrets (For Automated Testing)

Go to your GitHub repository settings and add these secrets:

1. **NEON_API_KEY**
   - Get from: https://console.neon.tech/app/settings/api-keys
   - Create a new API key with "Read & Write" permissions
   
2. **DISCORD_WEBHOOK_URL** (Optional but recommended)
   - Create a webhook in your Discord server: Server Settings > Integrations > Webhooks
   - Copy the webhook URL
   
3. **SLACK_WEBHOOK_URL** (Optional alternative to Discord)
   - Set up incoming webhook in Slack workspace

**To add secrets:**
```
GitHub Repo → Settings → Secrets and variables → Actions → New repository secret
```

### Step 3: Test the Backup Script Manually

```bash
# Run the first test manually
./scripts/test-backup-restore.sh

# Or with auto-cleanup
./scripts/test-backup-restore.sh --cleanup

# Check the logs
cat logs/backup-tests.log
```

### Step 4: Verify Neon PITR is Enabled

1. Go to https://console.neon.tech/
2. Select your Warden project
3. Navigate to Settings
4. Verify **Point-in-Time Recovery** is enabled
5. Check retention period (7 days on Free tier, 30 days on Pro)

**Recommendation:** Upgrade to Pro tier for 30-day retention if this is production data.

### Step 5: Schedule Your First Manual Test

Mark your calendar for the first Sunday of next month to run:

```bash
./scripts/test-backup-restore.sh --cleanup
```

This ensures you're familiar with the process before the automated tests run.

---

## 📖 How to Use

### Run Monthly Backup Test

```bash
# Automated (recommended)
./scripts/test-backup-restore.sh --cleanup

# Manual cleanup
./scripts/test-backup-restore.sh
# Then delete the test branch manually when done
```

### Restore from Backup (Emergency)

If you need to restore data urgently:

```bash
# 1. Create restore branch from specific time
neonctl branches create \
  --name "emergency-restore-$(date +%Y%m%d)" \
  --point-in-time "2026-01-12T10:00:00Z"

# 2. Get connection string
neonctl connection-string <branch-id>

# 3. Verify data
psql "<connection-string>"
\i scripts/verify-backup-data.sql

# 4. If good, update production .env with new DATABASE_URL
```

See [DATABASE_BACKUP.md](DATABASE_BACKUP.md) for detailed recovery scenarios.

### Check Test Results

```bash
# View all test logs
cat logs/backup-tests.log

# View latest test
tail -n 1 logs/backup-tests.log

# View GitHub Actions results
# Go to: https://github.com/[your-username]/warden/actions
```

---

## 🔔 Notifications Setup

### Discord Notifications (Recommended)

1. Create a webhook in your Discord server
2. Add `DISCORD_WEBHOOK_URL` to GitHub secrets
3. Tests will automatically notify your Discord channel monthly

### Slack Notifications (Alternative)

1. Create incoming webhook in Slack
2. Add `SLACK_WEBHOOK_URL` to GitHub secrets
3. Tests will notify Slack instead of Discord

---

## 📅 Testing Schedule

| Event | Frequency | Action |
|-------|-----------|--------|
| **Automated Test** | 1st of every month @ 2 AM UTC | GitHub Actions runs automatically |
| **Manual Verification** | Quarterly | Run `./scripts/test-backup-restore.sh` |
| **Documentation Review** | Every 6 months | Update [DATABASE_BACKUP.md](DATABASE_BACKUP.md) |
| **Disaster Recovery Drill** | Annually | Full recovery simulation |

---

## 🆘 Troubleshooting

### "neonctl: command not found"
```bash
npm install -g neonctl
neonctl auth
```

### "Not authenticated with Neon"
```bash
neonctl auth
# Follow the prompts to login
```

### "Could not create restore branch"
- Check Neon Console for any issues
- Verify your account has permissions
- Check if you've hit branch limits (Free tier: 10 branches)

### Test Script Fails
```bash
# Run with verbose output
bash -x ./scripts/test-backup-restore.sh

# Check Neon status
curl https://neonstatus.com/api/v2/status.json
```

---

## 📊 What the Automated Test Does

Every month on the 1st at 2 AM UTC:

1. ✅ Creates a Neon branch restored to 24 hours ago
2. ✅ Runs comprehensive verification queries
3. ✅ Checks data integrity (orphaned records, missing fields)
4. ✅ Verifies recent activity exists
5. ✅ Logs results to `logs/backup-tests.log`
6. ✅ Sends notification (Discord/Slack)
7. ✅ Creates GitHub issue if test fails
8. ✅ Cleans up test branch automatically

---

## 🎯 Success Criteria

Your backup system is working correctly if:

- ✅ Monthly tests pass without errors
- ✅ All integrity checks return `✓ PASS`
- ✅ Recent activity timestamps are within 24-48 hours
- ✅ Data counts match expected values
- ✅ You can successfully connect to restored branches

---

## 📝 Additional Resources

- **Full Documentation:** [DATABASE_BACKUP.md](DATABASE_BACKUP.md)
- **Neon Docs:** https://neon.tech/docs/guides/backup-restore
- **Neon Support:** support@neon.tech
- **Neon Status:** https://neonstatus.com/

---

## ✅ Setup Checklist

- [ ] Install Neon CLI (`npm install -g neonctl`)
- [ ] Authenticate with Neon (`neonctl auth`)
- [ ] Add `NEON_API_KEY` to GitHub secrets
- [ ] Add `DISCORD_WEBHOOK_URL` to GitHub secrets (optional)
- [ ] Run first manual test (`./scripts/test-backup-restore.sh`)
- [ ] Verify Neon PITR is enabled in console
- [ ] Check retention period (upgrade to Pro for 30 days)
- [ ] Schedule monthly manual tests (1st Sunday)
- [ ] Review [DATABASE_BACKUP.md](DATABASE_BACKUP.md)
- [ ] Test emergency restore procedure

---

**Questions?** Check [DATABASE_BACKUP.md](DATABASE_BACKUP.md) for comprehensive guides and recovery scenarios.
