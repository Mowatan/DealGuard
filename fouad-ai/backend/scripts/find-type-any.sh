#!/bin/bash
# Find all instances of 'any' type in TypeScript files
# Usage: ./scripts/find-type-any.sh

echo "🔍 Searching for 'any' type usage in backend..."
echo "=============================================="
echo ""

# Find all files with 'any' type
grep -r ": any\|<any>\|any\[\]\|Record<string, any>" src --include="*.ts" -n | \
  sed 's/:/ →/' | \
  awk -F: '{file=$1; line=$2; rest=$3; gsub(/^[ \t]+/, "", rest); print file ":" line " " rest}' | \
  sort

echo ""
echo "=============================================="
echo "Summary:"
total=$(grep -r ": any\|<any>\|any\[\]\|Record<string, any>" src --include="*.ts" | wc -l)
files=$(grep -r ": any\|<any>\|any\[\]\|Record<string, any>" src --include="*.ts" -l | wc -l)

echo "Total instances: $total"
echo "Files affected: $files"
echo ""
echo "Top 5 files with most 'any' usage:"
grep -r ": any\|<any>\|any\[\]\|Record<string, any>" src --include="*.ts" -c | \
  sort -t: -k2 -rn | \
  head -5 | \
  awk -F: '{print "  " $2 " instances in " $1}'
