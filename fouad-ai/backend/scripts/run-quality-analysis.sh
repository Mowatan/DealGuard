#!/bin/bash
# Comprehensive code quality analysis runner
# Runs all analysis scripts and generates summary report
# Usage: ./scripts/run-quality-analysis.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="$SCRIPT_DIR/../CODE_QUALITY_ANALYSIS_$(date +%Y%m%d_%H%M%S).txt"

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║           DEALGUARD CODE QUALITY ANALYSIS - $(date +%Y-%m-%d)                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Create output file
cat > "$OUTPUT_FILE" << 'EOF'
DEALGUARD CODE QUALITY ANALYSIS REPORT
Generated: $(date)
═══════════════════════════════════════════════════════════════════════════════

EOF

echo "Running analysis scripts..."
echo "Output will be saved to: $OUTPUT_FILE"
echo ""

# 1. Type Safety Analysis
echo "[1/4] Analyzing type safety ('any' usage)..."
{
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " 1. TYPE SAFETY ANALYSIS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
} >> "$OUTPUT_FILE"

if [ -f "$SCRIPT_DIR/find-type-any.sh" ]; then
    bash "$SCRIPT_DIR/find-type-any.sh" >> "$OUTPUT_FILE" 2>&1
else
    echo "Script not found: find-type-any.sh" >> "$OUTPUT_FILE"
fi

# 2. Error Handling Analysis
echo "[2/4] Analyzing error handling patterns..."
{
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " 2. ERROR HANDLING ANALYSIS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
} >> "$OUTPUT_FILE"

if [ -f "$SCRIPT_DIR/find-throw-errors.sh" ]; then
    bash "$SCRIPT_DIR/find-throw-errors.sh" >> "$OUTPUT_FILE" 2>&1
else
    echo "Script not found: find-throw-errors.sh" >> "$OUTPUT_FILE"
fi

# 3. Complexity Analysis
echo "[3/4] Analyzing code complexity..."
{
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " 3. CODE COMPLEXITY ANALYSIS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
} >> "$OUTPUT_FILE"

if [ -f "$SCRIPT_DIR/analyze-complexity.sh" ]; then
    bash "$SCRIPT_DIR/analyze-complexity.sh" >> "$OUTPUT_FILE" 2>&1
else
    echo "Script not found: analyze-complexity.sh" >> "$OUTPUT_FILE"
fi

# 4. Test Coverage Check
echo "[4/4] Checking test coverage..."
{
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " 4. TEST COVERAGE ANALYSIS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Test files found:"
    find src -name "*.test.ts" -o -name "*.spec.ts"
    echo ""
    echo "Total test files: $(find src -name "*.test.ts" -o -name "*.spec.ts" | wc -l)"
    echo "Total source files: $(find src -name "*.ts" | wc -l)"
    echo ""
    echo "⚠️  CRITICAL: Near-zero test coverage detected!"
    echo "   Recommendation: Implement comprehensive testing strategy"
    echo ""
} >> "$OUTPUT_FILE"

# Summary
{
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " SUMMARY & RECOMMENDATIONS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Priority Actions:"
    echo "  1. 🔴 CRITICAL: Implement testing infrastructure"
    echo "  2. 🔴 HIGH: Eliminate 'any' types (create proper interfaces)"
    echo "  3. 🟡 HIGH: Migrate to AppError classes"
    echo "  4. 🟡 MEDIUM: Refactor large service files"
    echo ""
    echo "Next Steps:"
    echo "  • Review full report: CODE_QUALITY_REVIEW.md"
    echo "  • Create GitHub issues for each improvement"
    echo "  • Schedule technical debt sprint"
    echo "  • Add quality gates to CI/CD"
    echo ""
    echo "Report saved to: $OUTPUT_FILE"
    echo ""
    echo "═══════════════════════════════════════════════════════════════════════════════"
} >> "$OUTPUT_FILE"

# Display results
echo ""
echo "✅ Analysis complete!"
echo ""
echo "📄 Full report saved to:"
echo "   $OUTPUT_FILE"
echo ""
echo "Quick summary:"
grep -A 10 "SUMMARY & RECOMMENDATIONS" "$OUTPUT_FILE" | tail -8
echo ""
echo "View full report with: cat $OUTPUT_FILE"
echo ""
