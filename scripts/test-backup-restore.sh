#!/bin/bash

###############################################################################
# Warden Database Backup Restoration Test Script
# 
# This script automates the monthly backup testing procedure by:
# 1. Creating a Neon branch restored to 24 hours ago
# 2. Running verification queries
# 3. Logging results
# 4. Optionally cleaning up the test branch
#
# Usage: ./test-backup-restore.sh [OPTIONS]
# Options:
#   --cleanup        Automatically delete test branch after verification
#   --restore-time   Specify custom restore point (default: 24h ago)
#   --help           Show this help message
#
# Requirements:
# - Neon CLI installed (npm install -g neonctl)
# - PostgreSQL client (psql) installed
# - Authenticated with neonctl (neonctl auth)
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
CLEANUP=false
RESTORE_TIME_AGO="24 hours ago"
LOG_FILE="logs/backup-tests.log"
PROJECT_NAME="warden"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --cleanup)
      CLEANUP=true
      shift
      ;;
    --restore-time)
      RESTORE_TIME_AGO="$2"
      shift 2
      ;;
    --help)
      head -n 20 "$0" | grep "^#" | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Create logs directory if it doesn't exist
mkdir -p logs

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Warden Database Backup Restoration Test${NC}"
echo -e "${BLUE}  $(date)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check if neonctl is installed
if ! command -v neonctl &> /dev/null; then
    echo -e "${RED}Error: neonctl is not installed${NC}"
    echo "Install it with: npm install -g neonctl"
    exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    echo "Install PostgreSQL client tools first"
    exit 1
fi

# Check if authenticated
if ! neonctl projects list &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with Neon${NC}"
    echo "Run: neonctl auth"
    exit 1
fi

echo -e "${GREEN}✓${NC} Prerequisites checked"
echo ""

# Get Neon project ID
echo -e "${YELLOW}→${NC} Getting Neon project information..."
PROJECT_ID=$(neonctl projects list --output json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Could not find Neon project${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Project ID: $PROJECT_ID"
echo ""

# Calculate restore timestamp (24 hours ago by default)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    RESTORE_TIMESTAMP=$(date -u -v-24H +"%Y-%m-%dT%H:%M:%SZ")
else
    # Linux
    RESTORE_TIMESTAMP=$(date -u -d "$RESTORE_TIME_AGO" +"%Y-%m-%dT%H:%M:%SZ")
fi

# Create test branch name with timestamp
TEST_BRANCH_NAME="backup-test-$(date +%Y%m%d-%H%M%S)"

echo -e "${YELLOW}→${NC} Creating restore branch from: $RESTORE_TIMESTAMP"
echo -e "${YELLOW}→${NC} Branch name: $TEST_BRANCH_NAME"
echo ""

# Create the restore branch
if ! BRANCH_OUTPUT=$(neonctl branches create \
    --project-id "$PROJECT_ID" \
    --name "$TEST_BRANCH_NAME" \
    --point-in-time "$RESTORE_TIMESTAMP" \
    --output json 2>&1); then
    echo -e "${RED}Error creating restore branch:${NC}"
    echo "$BRANCH_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✓${NC} Restore branch created successfully"
echo ""

# Extract branch ID from output
BRANCH_ID=$(echo "$BRANCH_OUTPUT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$BRANCH_ID" ]; then
    echo -e "${RED}Error: Could not extract branch ID${NC}"
    exit 1
fi

# Get connection string for the restored branch
echo -e "${YELLOW}→${NC} Getting connection string..."
CONNECTION_STRING=$(neonctl connection-string "$BRANCH_ID" --project-id "$PROJECT_ID" 2>&1 || echo "")

if [ -z "$CONNECTION_STRING" ]; then
    echo -e "${RED}Error: Could not get connection string${NC}"
    echo "Branch ID: $BRANCH_ID"
    exit 1
fi

echo -e "${GREEN}✓${NC} Connection string retrieved"
echo ""

# Run verification queries
echo -e "${YELLOW}→${NC} Running verification queries..."
echo ""

# Create temporary SQL file with verification queries
VERIFY_SQL=$(cat <<'EOF'
-- Critical table counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'characters', COUNT(*) FROM characters
UNION ALL
SELECT 'documents', COUNT(*) FROM documents
UNION ALL
SELECT 'groups', COUNT(*) FROM groups;

-- Latest activity timestamps
SELECT 
  'users' as table_name, 
  MAX(created_at) as latest_record,
  AGE(NOW(), MAX(created_at)) as age
FROM users
UNION ALL
SELECT 'characters', MAX(created_at), AGE(NOW(), MAX(created_at)) FROM characters
UNION ALL
SELECT 'documents', MAX(updated_at), AGE(NOW(), MAX(updated_at)) FROM documents;

-- Data integrity check
SELECT 
  (SELECT COUNT(*) FROM characters c LEFT JOIN users u ON c.user_id = u.id WHERE u.id IS NULL) as orphaned_characters;
EOF
)

# Execute verification queries
if VERIFY_OUTPUT=$(echo "$VERIFY_SQL" | psql "$CONNECTION_STRING" -t 2>&1); then
    echo -e "${GREEN}✓${NC} Verification queries completed"
    echo ""
    echo -e "${BLUE}Results:${NC}"
    echo "$VERIFY_OUTPUT"
    echo ""
    
    VERIFICATION_STATUS="PASSED"
else
    echo -e "${RED}✗${NC} Verification queries failed"
    echo "$VERIFY_OUTPUT"
    VERIFICATION_STATUS="FAILED"
fi

# Log test results
LOG_ENTRY="$(date -u +"%Y-%m-%d %H:%M:%S UTC") | Test: $VERIFICATION_STATUS | Branch: $TEST_BRANCH_NAME | Restore Point: $RESTORE_TIMESTAMP"
echo "$LOG_ENTRY" >> "$LOG_FILE"

echo -e "${GREEN}✓${NC} Results logged to $LOG_FILE"
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "Status: ${GREEN}$VERIFICATION_STATUS${NC}"
echo -e "Branch ID: $BRANCH_ID"
echo -e "Branch Name: $TEST_BRANCH_NAME"
echo -e "Restore Point: $RESTORE_TIMESTAMP"
echo ""

# Cleanup if requested
if [ "$CLEANUP" = true ]; then
    echo -e "${YELLOW}→${NC} Cleaning up test branch..."
    
    if neonctl branches delete "$BRANCH_ID" --project-id "$PROJECT_ID" 2>&1; then
        echo -e "${GREEN}✓${NC} Test branch deleted"
    else
        echo -e "${YELLOW}!${NC} Could not delete test branch automatically"
        echo "Delete it manually via Neon Console or run:"
        echo "neonctl branches delete $BRANCH_ID --project-id $PROJECT_ID"
    fi
else
    echo -e "${YELLOW}Note:${NC} Test branch was not automatically deleted"
    echo "To delete it manually, run:"
    echo "neonctl branches delete $BRANCH_ID --project-id $PROJECT_ID"
fi

echo ""
echo -e "${GREEN}Backup restoration test completed!${NC}"
echo ""

# Exit with appropriate code
if [ "$VERIFICATION_STATUS" = "PASSED" ]; then
    exit 0
else
    exit 1
fi
