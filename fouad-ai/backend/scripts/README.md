# Code Quality Analysis Scripts

This directory contains scripts for analyzing and improving code quality in the DealGuard backend.

## Available Scripts

### 🔍 Analysis Scripts

#### `run-quality-analysis.sh`
**Comprehensive analysis runner** - Executes all analysis scripts and generates a timestamped report.

```bash
./scripts/run-quality-analysis.sh
```

Output: `CODE_QUALITY_ANALYSIS_YYYYMMDD_HHMMSS.txt`

---

#### `find-type-any.sh`
Find all instances of `any` type usage that weaken TypeScript's type safety.

```bash
./scripts/find-type-any.sh
```

**What it finds:**
- `: any` type annotations
- `any[]` array types
- `<any>` generic types
- `Record<string, any>` patterns

**Example output:**
```
src/modules/deals/deals.service.ts:123 → variables: Record<string, any>
src/lib/email.service.ts:45 → details?: any

Summary:
Total instances: 195
Files affected: 28
```

---

#### `find-throw-errors.sh`
Find all instances of `throw new Error()` that should use `AppError` classes.

```bash
./scripts/find-throw-errors.sh
```

**What it finds:**
- `throw new Error("...")` patterns
- Files needing migration to AppError

**Suggested replacements:**
- `throw new Error("Unauthorized")` → `throw new UnauthorizedError()`
- `throw new Error("not found")` → `throw new NotFoundError()`
- `throw new Error("Invalid")` → `throw new ValidationError()`
- `throw new Error("Access denied")` → `throw new ForbiddenError()`

---

#### `analyze-complexity.sh`
Analyze code complexity metrics.

```bash
./scripts/analyze-complexity.sh
```

**What it analyzes:**
1. Largest files (by line count)
2. Files with most functions
3. Console.log/error usage
4. TODO/FIXME comments

**Recommendations:**
- Files >600 lines should be split
- Functions >50 lines should be refactored
- Replace console.log with structured logger
- Convert TODOs to GitHub issues

---

## 🧪 Testing Scripts

#### `test-email.ts`
Test email functionality with Mailgun.

```bash
npm run test:email
```

#### `test-milestone-emails.ts`
Test milestone negotiation email templates.

```bash
npm run test:milestone-emails
```

---

## 📊 Usage Workflow

### Initial Assessment
```bash
# Run comprehensive analysis
./scripts/run-quality-analysis.sh

# Review the generated report
cat CODE_QUALITY_ANALYSIS_*.txt
```

### Targeted Improvements

**Fix Type Safety:**
```bash
# Find all 'any' usages
./scripts/find-type-any.sh > any-usage.txt

# Fix them one file at a time
# Start with files with the most instances
```

**Fix Error Handling:**
```bash
# Find all throw new Error patterns
./scripts/find-throw-errors.sh > error-patterns.txt

# Migrate to AppError classes
# Import: import { NotFoundError, ValidationError, ... } from './middleware/error-handler'
```

**Reduce Complexity:**
```bash
# Identify large files
./scripts/analyze-complexity.sh

# Refactor files >600 lines
# Extract logical components into separate services
```

---

## 🎯 Code Quality Goals

Based on `CODE_QUALITY_REVIEW.md`:

| Metric | Current | Target |
|--------|---------|--------|
| Test Coverage | <1% | 70% |
| `any` Type Usage | 195 | 0 |
| Error Handling Consistency | 63% | 100% |
| Max File Size | 1,614 lines | <600 lines |

---

## 🔧 Integration with CI/CD

### Pre-commit Hook (Recommended)
```bash
# .git/hooks/pre-commit
#!/bin/bash
npm run build || exit 1
npm run test || exit 1
./scripts/find-type-any.sh | grep "Total instances: 0" || echo "Warning: 'any' types detected"
```

### GitHub Actions (Example)
```yaml
- name: Code Quality Check
  run: |
    ./scripts/run-quality-analysis.sh
    ./scripts/find-type-any.sh
```

---

## 📚 Related Documentation

- **Full Code Review**: `../../CODE_QUALITY_REVIEW.md`
- **Quick Summary**: `../../CODE_QUALITY_SUMMARY.txt`
- **GitHub Issues**: Use `.github/ISSUE_TEMPLATE/code-quality-improvement.md`
- **ESLint Config**: `../.eslintrc.json`

---

## 🤝 Contributing

When adding new analysis scripts:
1. Follow the naming pattern: `verb-noun.sh` (e.g., `find-type-any.sh`)
2. Add usage instructions to this README
3. Include clear output formatting
4. Provide actionable recommendations

---

**Last Updated**: 2026-02-22
