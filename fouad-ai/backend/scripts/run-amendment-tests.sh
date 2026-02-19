#!/bin/bash

# Run Amendment & Deletion System Tests
#
# This script runs comprehensive tests for the deal amendment and deletion system

set -e

cd "$(dirname "$0")/.."

echo "🧪 Starting Amendment & Deletion System Tests..."
echo ""

# Check if backend is running
if ! curl -s http://localhost:4000/health > /dev/null 2>&1; then
  echo "❌ Backend server is not running on port 4000"
  echo "Please start the backend server first:"
  echo "  cd fouad-ai/backend"
  echo "  npm run dev"
  exit 1
fi

echo "✅ Backend server is running"
echo ""

# Run the TypeScript test script
npx tsx scripts/test-amendment-deletion.ts

exit $?
