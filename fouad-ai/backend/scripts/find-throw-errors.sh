#!/bin/bash
# Find all instances of 'throw new Error()' that should use AppError
# Usage: ./scripts/find-throw-errors.sh

echo "🔍 Searching for 'throw new Error()' patterns..."
echo "================================================"
echo ""

# Find all throw new Error instances
grep -r "throw new Error" src --include="*.ts" -n | \
  sed 's/:/ →/' | \
  awk -F: '{file=$1; line=$2; rest=$3; gsub(/^[ \t]+/, "", rest); print file ":" line " " rest}' | \
  sort

echo ""
echo "================================================"
echo "Summary:"
total=$(grep -r "throw new Error" src --include="*.ts" | wc -l)
files=$(grep -r "throw new Error" src --include="*.ts" -l | wc -l)

echo "Total instances: $total"
echo "Files affected: $files"
echo ""
echo "Top 5 files needing AppError migration:"
grep -r "throw new Error" src --include="*.ts" -c | \
  sort -t: -k2 -rn | \
  head -5 | \
  awk -F: '{print "  " $2 " instances in " $1}'

echo ""
echo "Suggested replacements:"
echo "  'throw new Error(\"Unauthorized' → 'throw new UnauthorizedError('"
echo "  'throw new Error(\".*not found' → 'throw new NotFoundError('"
echo "  'throw new Error(\"Invalid' → 'throw new ValidationError('"
echo "  'throw new Error(\"Access denied' → 'throw new ForbiddenError('"
