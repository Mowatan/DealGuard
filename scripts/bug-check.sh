#!/bin/bash

echo "🔍 DealGuard Bug Check - Quick Scan"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Database Schema Validation
echo "1. Checking database schema..."
cd fouad-ai/backend
npx prisma validate > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database schema valid${NC}"
else
    echo -e "${RED}✗ Database schema has errors${NC}"
    npx prisma validate
fi

# Check 2: TypeScript Compilation
echo ""
echo "2. Checking TypeScript compilation..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend builds successfully${NC}"
else
    echo -e "${RED}✗ Backend has build errors${NC}"
    npm run build 2>&1 | head -20
fi

cd ../frontend

npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend builds successfully${NC}"
else
    echo -e "${RED}✗ Frontend has build errors${NC}"
    npm run build 2>&1 | head -20
fi

# Check 3: Missing Environment Variables
echo ""
echo "3. Checking environment variables..."

REQUIRED_BACKEND_VARS=(
    "DATABASE_URL"
    "REDIS_URL"
    "CLERK_SECRET_KEY"
    "MAILGUN_API_KEY"
)

REQUIRED_FRONTEND_VARS=(
    "NEXT_PUBLIC_API_URL"
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
)

cd ../backend
for var in "${REQUIRED_BACKEND_VARS[@]}"; do
    if grep -q "$var" .env 2>/dev/null; then
        echo -e "${GREEN}✓ $var configured${NC}"
    else
        echo -e "${RED}✗ $var missing${NC}"
    fi
done

cd ../frontend
for var in "${REQUIRED_FRONTEND_VARS[@]}"; do
    if grep -q "$var" .env.local 2>/dev/null; then
        echo -e "${GREEN}✓ $var configured${NC}"
    else
        echo -e "${RED}✗ $var missing${NC}"
    fi
done

# Check 4: Dangerous Code Patterns
echo ""
echo "4. Checking for dangerous code patterns..."

cd ../backend/src

# Check for missing null checks
NULL_CHECKS=$(grep -r "\.findUnique\|\.findFirst" --include="*.ts" 2>/dev/null | wc -l)
echo -e "${YELLOW}⚠ Found $NULL_CHECKS database queries (verify null checks)${NC}"

# Check for 'any' types
ANY_TYPES=$(grep -r ": any" --include="*.ts" 2>/dev/null | wc -l)
if [ $ANY_TYPES -gt 10 ]; then
    echo -e "${YELLOW}⚠ Found $ANY_TYPES 'any' types (type safety concern)${NC}"
else
    echo -e "${GREEN}✓ Only $ANY_TYPES 'any' types (acceptable)${NC}"
fi

# Check for console.log (should use logger)
CONSOLE_LOGS=$(grep -r "console\.log" --include="*.ts" 2>/dev/null | wc -l)
if [ $CONSOLE_LOGS -gt 20 ]; then
    echo -e "${YELLOW}⚠ Found $CONSOLE_LOGS console.log statements (use logger)${NC}"
else
    echo -e "${GREEN}✓ Only $CONSOLE_LOGS console.log statements${NC}"
fi

# Check 5: Test Coverage
echo ""
echo "5. Checking test coverage..."

cd ../../backend
TEST_FILES=$(find . -name "*.test.ts" 2>/dev/null | wc -l)
if [ $TEST_FILES -lt 5 ]; then
    echo -e "${RED}✗ Only $TEST_FILES test files (need more)${NC}"
elif [ $TEST_FILES -lt 20 ]; then
    echo -e "${YELLOW}⚠ Found $TEST_FILES test files (acceptable)${NC}"
else
    echo -e "${GREEN}✓ Found $TEST_FILES test files (good coverage)${NC}"
fi

# Check 6: Recent Errors in Logs (if logs exist)
echo ""
echo "6. Checking for recent errors..."
echo -e "${YELLOW}⚠ Check Railway logs manually at railway.app${NC}"
echo -e "${YELLOW}⚠ Check Vercel logs manually at vercel.com${NC}"

echo ""
echo "===================================="
echo "Bug check complete!"
echo ""
echo "Next steps:"
echo "1. Fix any ${RED}RED${NC} issues immediately"
echo "2. Review ${YELLOW}YELLOW${NC} warnings"
echo "3. Run full bug audit with Claude Code"
echo ""
