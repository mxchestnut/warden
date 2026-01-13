# Database Backup & Recovery Strategy

**Last Updated:** January 12, 2026  
**Database:** Neon PostgreSQL (Production)  
**Backup Method:** Point-in-Time Recovery (PITR)

---

## Overview

Warden uses Neon PostgreSQL with built-in Point-in-Time Recovery (PITR) for database backups. This allows restoration to any point in time within the retention window.

**Backup Coverage:**
- ✅ Automatic continuous backups
- ✅ Point-in-Time Recovery up to 7 days (Free tier) or 30 days (Pro tier)
- ✅ No manual backup scripts needed
- ✅ Zero backup storage costs on Neon

---

## Neon Point-in-Time Recovery (PITR)

### What is PITR?

Neon automatically backs up your database continuously using:
- **WAL (Write-Ahead Log) archiving** - Every change is logged
- **Periodic snapshots** - Base snapshots for faster recovery
- **Retention:** 7 days (Free) or 30 days (Pro)

You can restore to **any timestamp** within the retention window, down to the second.

### How to Use PITR

#### Via Neon Console (Easiest):

1. **Go to:** https://console.neon.tech/
2. **Select your project:** Warden
3. **Navigate to:** Backups or Restore tab
4. **Select restore point:** Choose date/time
5. **Choose restore method:**
   - **Branch (Recommended):** Creates a new branch with data at that point
   - **Replace:** Overwrites current database (DANGEROUS)
6. **Test the restored branch** before switching production

#### Via Neon CLI:

```bash
# Install Neon CLI
npm install -g neonctl

# Login
neonctl auth

# List available restore points
neonctl branches list --project-id <your-project-id>

# Create a restore branch from specific timestamp
neonctl branches create \
  --project-id <your-project-id> \
  --name "restore-$(date +%Y%m%d-%H%M%S)" \
  --point-in-time "2026-01-12T10:30:00Z"

# Get connection string for restored branch
neonctl connection-string <branch-id>
```

#### Via Neon API:

```bash
# Set your API key
export NEON_API_KEY="your-api-key-here"

# Create restore branch
curl -X POST "https://console.neon.tech/api/v2/projects/<project-id>/branches" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": {
      "name": "restore-backup-20260112",
      "parent_id": "main",
      "point_in_time": "2026-01-12T10:30:00Z"
    }
  }'
```

---

## Backup Testing Procedure

**Frequency:** Monthly (1st Sunday of each month)  
**Duration:** ~30 minutes  
**Responsibility:** DevOps/Lead Developer

### Monthly Backup Test Checklist

#### 1. Preparation (5 min)
```bash
# Go to project directory
cd /path/to/warden

# Ensure scripts are executable
chmod +x scripts/test-backup-restore.sh

# Verify Neon CLI is installed
neonctl --version
```

#### 2. Create Test Restore Branch (5 min)
```bash
# Run the automated test script
./scripts/test-backup-restore.sh

# Or manually via Neon Console:
# 1. Go to Neon Console > Backups
# 2. Select "Restore to 24 hours ago"
# 3. Create branch named "backup-test-YYYYMMDD"
```

#### 3. Verify Data Integrity (10 min)
```bash
# Connect to the restored branch
psql "<restored-branch-connection-string>"

# Run verification queries
\i scripts/verify-backup-data.sql

# Check critical tables
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM characters;
SELECT COUNT(*) FROM documents;
SELECT COUNT(*) FROM groups;

# Verify recent data exists (should be ~24h old)
SELECT MAX(created_at) FROM users;
SELECT MAX(updated_at) FROM characters;

# Check for data consistency
SELECT 
  table_name, 
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
```

#### 4. Test Application Connection (5 min)
```bash
# Copy .env to test env
cp .env .env.backup-test

# Update DATABASE_URL to restored branch
# DATABASE_URL=<restored-branch-connection-string>

# Start backend with test database
NODE_ENV=development DATABASE_URL="<restored-branch-url>" npm run dev

# Verify:
# - Application starts successfully
# - Can query users
# - Can query characters
# - Discord bot connects (if testing bot)
```

#### 5. Document Results (5 min)
```bash
# Log test results
echo "$(date): Backup test completed successfully" >> logs/backup-tests.log

# Or log failure
echo "$(date): Backup test FAILED - [reason]" >> logs/backup-tests.log
```

#### 6. Cleanup (2 min)
```bash
# Delete test branch via Neon Console
# Or via CLI:
neonctl branches delete <test-branch-id> --project-id <project-id>

# Restore original .env
rm .env.backup-test
```

---

## Automated Backup Testing

### GitHub Actions Monthly Test

A GitHub Action runs on the 1st of each month to verify backups are working.

**Workflow:** `.github/workflows/backup-test.yml`

**What it does:**
1. Creates a restore branch from 24 hours ago
2. Runs verification queries
3. Sends Slack/Discord notification with results
4. Cleans up test branch

**To trigger manually:**
```bash
# Go to GitHub Actions
# Select "Monthly Backup Test"
# Click "Run workflow"
```

---

## Recovery Scenarios

### Scenario 1: Accidental Data Deletion (User deleted characters)

**Timeline:** Deleted 30 minutes ago

**Recovery Steps:**
```bash
# 1. Identify exact deletion time
# Check Discord bot logs or application logs

# 2. Create restore branch 1 hour before deletion
neonctl branches create \
  --project-id <project-id> \
  --name "recover-deleted-chars-$(date +%Y%m%d)" \
  --point-in-time "2026-01-12T09:00:00Z"

# 3. Connect to restored branch
psql "<restored-branch-connection-string>"

# 4. Export deleted characters
\copy (SELECT * FROM characters WHERE id IN (123, 456, 789)) TO '/tmp/recovered_chars.csv' CSV HEADER;

# 5. Import to production
psql "<production-connection-string>"
\copy characters FROM '/tmp/recovered_chars.csv' CSV HEADER;
```

**Prevention:** Implement soft deletes (add `deleted_at` column instead of hard deletes)

---

### Scenario 2: Bad Migration Deployed

**Timeline:** Migration ran 10 minutes ago, broke the app

**Recovery Steps:**
```bash
# 1. IMMEDIATELY create restore branch from before migration
neonctl branches create \
  --project-id <project-id> \
  --name "pre-migration-restore" \
  --point-in-time "2026-01-12T09:45:00Z"  # 15 min ago

# 2. Update production DATABASE_URL to restored branch
# Edit .env on production server
DATABASE_URL=<restored-branch-connection-string>

# 3. Restart backend
pm2 restart warden-backend

# 4. Verify application is working

# 5. Fix the migration
# Work on the bad migration locally

# 6. Test migration on a branch
neonctl branches create --name "migration-test"
# Run migration on test branch
# Verify it works

# 7. Apply fixed migration to production

# 8. Cleanup restore branch
```

**Prevention:** Always test migrations on a Neon branch first

---

### Scenario 3: Database Corruption

**Timeline:** Corruption detected now, extent unknown

**Recovery Steps:**
```bash
# 1. Immediately stop writes to production
pm2 stop warden-backend

# 2. Investigate corruption
psql "<production-url>"
# Run integrity checks
SELECT * FROM pg_stat_database;
VACUUM ANALYZE;

# 3. Determine corruption start time from logs

# 4. Create restore branch from before corruption
neonctl branches create \
  --project-id <project-id> \
  --name "pre-corruption-restore" \
  --point-in-time "<timestamp-before-corruption>"

# 5. Verify restored data
psql "<restored-branch-url>"
# Run verification queries

# 6. Switch production to restored branch
# Update .env DATABASE_URL
# Restart backend

# 7. Investigate root cause
```

---

### Scenario 4: Complete Database Loss

**Timeline:** Entire database unavailable

**Recovery Steps:**
```bash
# 1. Check Neon status
# Go to https://neonstatus.com/

# 2. If Neon is down, wait for recovery
# Neon has redundant backups

# 3. If project is deleted/corrupted:
# Contact Neon support immediately
# support@neon.tech

# 4. While waiting, restore from latest PITR
neonctl branches create \
  --project-id <project-id> \
  --name "emergency-restore" \
  --point-in-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)"

# 5. Update production to use restored branch
```

**Prevention:** 
- Consider secondary backup to AWS RDS snapshot (weekly)
- Export critical tables to S3 daily

---

## Backup Verification Queries

### Critical Data Counts
```sql
-- Run these monthly to track database growth
SELECT 
  'users' as table_name, 
  COUNT(*) as count,
  MAX(created_at) as latest_record
FROM users
UNION ALL
SELECT 
  'characters', 
  COUNT(*), 
  MAX(created_at)
FROM characters
UNION ALL
SELECT 
  'documents', 
  COUNT(*), 
  MAX(created_at)
FROM documents
UNION ALL
SELECT 
  'groups', 
  COUNT(*), 
  MAX(created_at)
FROM groups;
```

### Data Integrity Checks
```sql
-- Check for orphaned records
SELECT COUNT(*) as orphaned_characters
FROM characters c
LEFT JOIN users u ON c.user_id = u.id
WHERE u.id IS NULL;

-- Check for missing required fields
SELECT COUNT(*) as invalid_users
FROM users
WHERE username IS NULL OR username = '';

-- Check for data consistency
SELECT 
  u.username,
  COUNT(c.id) as character_count
FROM users u
LEFT JOIN characters c ON c.user_id = u.id
GROUP BY u.id, u.username
HAVING COUNT(c.id) > 100;  -- Flag users with suspiciously high character counts
```

### Recent Activity Check
```sql
-- Verify recent data exists (should be within 24 hours for active database)
SELECT 
  table_name,
  latest_activity,
  age(NOW(), latest_activity) as time_since_last_activity
FROM (
  SELECT 'users' as table_name, MAX(created_at) as latest_activity FROM users
  UNION ALL
  SELECT 'characters', MAX(updated_at) FROM characters
  UNION ALL
  SELECT 'documents', MAX(updated_at) FROM documents
  UNION ALL
  SELECT 'hall_of_fame', MAX(created_at) FROM hall_of_fame
) as activity_check;
```

---

## Backup Test Log Template

```markdown
## Backup Test - [Date]

**Tester:** [Name]  
**Date:** YYYY-MM-DD  
**Time:** HH:MM UTC  
**Restore Point:** [Timestamp]  

### Results

- [ ] Restore branch created successfully
- [ ] Data integrity verified
- [ ] Application connected to restored database
- [ ] Critical queries executed successfully
- [ ] Data counts match expected values
- [ ] No orphaned records found
- [ ] Recent activity present

### Metrics

- **Users count:** [number]
- **Characters count:** [number]
- **Documents count:** [number]
- **Latest activity:** [timestamp]
- **Restore time:** [duration]

### Issues Found

[None / List any issues]

### Actions Taken

[Describe any corrective actions]

### Next Test

**Scheduled:** First Sunday of next month
```

---

## Emergency Contacts

**Neon Support:**
- Email: support@neon.tech
- Status: https://neonstatus.com/
- Docs: https://neon.tech/docs/

**Internal Contacts:**
- Lead Developer: [Your contact]
- DevOps: [Contact]
- On-call: [Contact]

---

## Backup Best Practices

### ✅ DO:
- Test backups monthly
- Document all recovery procedures
- Use branches for testing migrations
- Keep PITR retention at maximum (30 days on Pro tier)
- Monitor Neon status page
- Log all backup tests
- Practice recovery procedures

### ❌ DON'T:
- Assume backups work without testing
- Use "Replace" restore method without testing first
- Delete old branches immediately (keep for 1 week)
- Run untested migrations on production
- Ignore backup test failures

---

## Future Improvements

### Planned Enhancements:
1. **Secondary Backup:** Weekly PostgreSQL dump to AWS S3
2. **Automated Daily Verification:** GitHub Action to check backup health
3. **Disaster Recovery Plan:** Full runbook for various scenarios
4. **Backup Metrics Dashboard:** Track backup health over time
5. **Slack/Discord Alerts:** Notify team of backup test results

### Consider:
- Multi-region replication (if Neon supports)
- Cross-platform backup (AWS RDS, Google Cloud SQL)
- Encrypted backup exports
- Compliance documentation (GDPR, CCPA data retention)

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-12 | Initial backup strategy documentation | AI Assistant |

