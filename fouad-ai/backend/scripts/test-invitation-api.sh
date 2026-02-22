#!/bin/bash

echo "🧪 TESTING INVITATION FLOW - Production API"
echo "════════════════════════════════════════════════════════════"
echo ""

API_URL="https://api.dealguard.org"

# Get invitation token from user
if [ -z "$1" ]; then
  echo "Usage: ./test-invitation-api.sh <invitation-token>"
  echo ""
  echo "To get an invitation token:"
  echo "  1. Create a deal at https://dealguard.org/deals/new"
  echo "  2. Add a party with an email"
  echo "  3. Check the invitation email for the token"
  echo "  4. Run: ./test-invitation-api.sh <token>"
  echo ""
  exit 1
fi

TOKEN="$1"

echo "📋 Step 1: Testing invitation viewing (public endpoint)..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_URL/api/invitations/$TOKEN")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS:.*//')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Successfully fetched invitation details"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "❌ Failed to fetch invitation (Status: $HTTP_STATUS)"
  echo "$BODY"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Step 2: Testing acceptance without auth (should fail with 401)..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  "$API_URL/api/invitations/$TOKEN/accept")
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS:.*//')

if [ "$HTTP_STATUS" = "401" ]; then
  echo "✅ Correctly rejected with 401 Unauthorized"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "❌ Expected 401, got $HTTP_STATUS"
  echo "$BODY"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🧪 MANUAL TESTING REQUIRED"
echo ""
echo "To complete the full invitation flow test:"
echo ""
echo "1. Open this URL in an INCOGNITO window:"
echo "   https://dealguard.org/invitations/$TOKEN"
echo ""
echo "2. Click 'Sign Up & Accept' button"
echo "3. Complete Clerk signup"
echo "4. You should auto-redirect to deal page"
echo "5. Look for success message: 'Welcome to the deal!'"
echo "6. Check 'My Deals' list"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
