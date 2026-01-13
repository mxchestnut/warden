-- Warden Database Backup Verification Queries
-- Run these queries after restoring a backup to verify data integrity

-- ============================================================================
-- SECTION 1: Critical Table Counts
-- ============================================================================

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'CRITICAL TABLE COUNTS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  'users' as table_name, 
  COUNT(*) as total_records,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_7d,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_30d
FROM users
UNION ALL
SELECT 
  'characters', 
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END)
FROM characters
UNION ALL
SELECT 
  'documents', 
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END)
FROM documents
UNION ALL
SELECT 
  'groups', 
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END)
FROM groups
UNION ALL
SELECT 
  'hall_of_fame', 
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END)
FROM hall_of_fame
UNION ALL
SELECT 
  'character_memories', 
  COUNT(*),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END),
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END)
FROM character_memories;

-- ============================================================================
-- SECTION 2: Latest Activity Timestamps
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'LATEST ACTIVITY (Should be within 24-48 hours for active database)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  table_name,
  latest_record,
  AGE(NOW(), latest_record) as time_since_last_record
FROM (
  SELECT 'users' as table_name, MAX(created_at) as latest_record FROM users
  UNION ALL
  SELECT 'characters', MAX(created_at) FROM characters
  UNION ALL
  SELECT 'documents', MAX(updated_at) FROM documents
  UNION ALL
  SELECT 'groups', MAX(created_at) FROM groups
  UNION ALL
  SELECT 'hall_of_fame', MAX(created_at) FROM hall_of_fame
  UNION ALL
  SELECT 'character_stats', MAX(created_at) FROM character_stats
) as activity_check
ORDER BY latest_record DESC;

-- ============================================================================
-- SECTION 3: Data Integrity Checks
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'DATA INTEGRITY CHECKS (All should return 0 or low numbers)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

-- Check for orphaned characters (characters without users)
SELECT 
  'Orphaned Characters' as check_name,
  COUNT(*) as issue_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM characters c
LEFT JOIN users u ON c.user_id = u.id
WHERE u.id IS NULL

UNION ALL

-- Check for orphaned documents (documents without users)
SELECT 
  'Orphaned Documents',
  COUNT(*),
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END
FROM documents d
LEFT JOIN users u ON d.user_id = u.id
WHERE u.id IS NULL

UNION ALL

-- Check for orphaned memories (memories without characters)
SELECT 
  'Orphaned Memories',
  COUNT(*),
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END
FROM character_memories cm
LEFT JOIN characters c ON cm.character_id = c.id
WHERE c.id IS NULL

UNION ALL

-- Check for users with missing required fields
SELECT 
  'Invalid Users (missing username)',
  COUNT(*),
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END
FROM users
WHERE username IS NULL OR username = ''

UNION ALL

-- Check for characters with missing required fields
SELECT 
  'Invalid Characters (missing name)',
  COUNT(*),
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END
FROM characters
WHERE name IS NULL OR name = '';

-- ============================================================================
-- SECTION 4: Database Size and Growth
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'DATABASE SIZE AND TABLE SIZES'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 15;

-- ============================================================================
-- SECTION 5: User Activity Statistics
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'TOP USERS BY CHARACTER COUNT'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  u.username,
  u.id as user_id,
  COUNT(c.id) as character_count,
  MAX(c.created_at) as latest_character_created
FROM users u
LEFT JOIN characters c ON c.user_id = u.id
GROUP BY u.id, u.username
ORDER BY character_count DESC
LIMIT 10;

-- ============================================================================
-- SECTION 6: Recent Character Activity
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'MOST RECENTLY CREATED CHARACTERS (Last 10)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  c.id,
  c.name,
  u.username as owner,
  c.created_at,
  AGE(NOW(), c.created_at) as created_ago
FROM characters c
JOIN users u ON c.user_id = u.id
ORDER BY c.created_at DESC
LIMIT 10;

-- ============================================================================
-- SECTION 7: PathCompanion Integration Check
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'PATHCOMPANION INTEGRATION STATUS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  COUNT(*) as total_characters,
  COUNT(CASE WHEN pathcompanion_id IS NOT NULL THEN 1 END) as synced_with_pathcompanion,
  COUNT(CASE WHEN pathcompanion_id IS NULL THEN 1 END) as not_synced,
  ROUND(
    100.0 * COUNT(CASE WHEN pathcompanion_id IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
    2
  ) as sync_percentage
FROM characters;

-- ============================================================================
-- SECTION 8: Discord Bot Usage Statistics
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'DISCORD BOT STATISTICS (If character_stats table exists)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  c.name,
  u.username,
  cs.messages_sent,
  cs.dice_rolled,
  cs.critical_hits,
  cs.critical_failures,
  cs.last_activity
FROM character_stats cs
JOIN characters c ON cs.character_id = c.id
JOIN users u ON c.user_id = u.id
ORDER BY cs.messages_sent DESC
LIMIT 10;

-- ============================================================================
-- SECTION 9: Database Health Indicators
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'DATABASE CONNECTION AND HEALTH'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  pg_database.datname as database_name,
  pg_size_pretty(pg_database_size(pg_database.datname)) as database_size,
  (SELECT count(*) FROM pg_stat_activity WHERE datname = pg_database.datname) as active_connections
FROM pg_database
WHERE datname = current_database();

-- ============================================================================
-- SECTION 10: Summary
-- ============================================================================

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo 'VERIFICATION SUMMARY'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo 'If all integrity checks show ✓ PASS and recent activity exists,'
\echo 'the backup restoration was successful!'
\echo ''
\echo 'Next steps:'
\echo '1. Review the data counts and compare to expected values'
\echo '2. Test application connection to this restored database'
\echo '3. Log results in logs/backup-tests.log'
\echo '4. Clean up test branch if no longer needed'
\echo ''
