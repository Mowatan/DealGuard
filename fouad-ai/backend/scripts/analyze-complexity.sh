#!/bin/bash
# Analyze code complexity - find large files and functions
# Usage: ./scripts/analyze-complexity.sh

echo "📊 Code Complexity Analysis"
echo "============================"
echo ""

echo "1. Largest Files (by line count):"
echo "-----------------------------------"
find src -name "*.ts" -exec wc -l {} + | \
  sort -rn | \
  head -11 | \
  tail -10 | \
  awk '{printf "  %4d lines → %s\n", $1, $2}'

echo ""
echo "2. Files with Most Functions:"
echo "-----------------------------------"
for file in $(find src -name "*.service.ts" -o -name "*.routes.ts"); do
  count=$(grep -c "^export.*function\|^async function" "$file" 2>/dev/null || echo "0")
  if [ "$count" -gt 0 ]; then
    echo "$count:$file"
  fi
done | sort -t: -k1 -rn | head -10 | awk -F: '{printf "  %2d functions → %s\n", $1, $2}'

echo ""
echo "3. Console.log/error Usage:"
echo "-----------------------------------"
grep -r "console\." src --include="*.ts" -c | \
  sort -t: -k2 -rn | \
  head -10 | \
  awk -F: '{printf "  %2d instances → %s\n", $2, $1}'

echo ""
echo "4. TODO/FIXME Comments:"
echo "-----------------------------------"
grep -r "TODO\|FIXME\|HACK\|XXX" src --include="*.ts" -n | \
  sed 's/:/ →/' | \
  awk '{print "  " $0}'

echo ""
echo "============================"
echo "Recommendations:"
echo "  • Files >600 lines should be split"
echo "  • Functions >50 lines should be refactored"
echo "  • Replace console.log with structured logger"
echo "  • Convert TODOs to GitHub issues"
