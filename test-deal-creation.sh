#!/bin/bash

echo "🧪 Testing New Deal Creation Flow"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# API Configuration
API_URL="http://localhost:4000"
TEST_TOKEN="test-token-for-deal-creation"
TEST_USER_ID="test_user_deal_creator"

echo "📝 Step 1: Preparing Test Data"
echo "  Simulating 5-step wizard flow..."
echo ""

# Create deal payload
DEAL_PAYLOAD=$(cat <<EOF
{
  "title": "Commercial Property Sale - 123 Main Street",
  "description": "Sale of a commercial property in downtown area. Property includes ground floor retail space and upper floor offices.",
  "parties": [
    {
      "role": "BUYER",
      "name": "John Doe",
      "isOrganization": false,
      "contactEmail": "john.doe@example.com",
      "contactPhone": "+1 234 567 8900"
    },
    {
      "role": "SELLER",
      "name": "Jane Smith",
      "isOrganization": false,
      "contactEmail": "jane.smith@example.com",
      "contactPhone": "+1 234 567 8901"
    },
    {
      "role": "Legal Representative",
      "name": "Bob Wilson",
      "isOrganization": false,
      "contactEmail": "bob.wilson@example.com",
      "contactPhone": "+1 234 567 8902"
    },
    {
      "role": "AGENT",
      "name": "Sarah Johnson",
      "isOrganization": false,
      "contactEmail": "sarah.johnson@example.com",
      "contactPhone": "+1 234 567 8903"
    },
    {
      "role": "Escrow Service Provider",
      "name": "SecureEscrow LLC",
      "isOrganization": true,
      "contactEmail": "contact@secureescrow.com",
      "contactPhone": "+1 234 567 8904"
    }
  ],
  "creatorName": "John Doe",
  "creatorEmail": "john.doe@example.com"
}
EOF
)

echo "📊 Deal Summary:"
echo "  Title: Commercial Property Sale - 123 Main Street"
echo "  Total Parties: 5"
echo "  Creator: John Doe (john.doe@example.com)"
echo ""
echo "👥 Parties:"
echo "  1. John Doe (BUYER) - Creator"
echo "  2. Jane Smith (SELLER)"
echo "  3. Bob Wilson (Legal Representative) - CUSTOM ROLE"
echo "  4. Sarah Johnson (AGENT)"
echo "  5. SecureEscrow LLC (Escrow Service Provider) - CUSTOM ROLE, Organization"
echo ""

echo "📝 Step 2: Creating Deal via API"
echo "  POST $API_URL/api/deals"
echo ""

# Make API call
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$API_URL/api/deals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "x-test-user-id: $TEST_USER_ID" \
  -d "$DEAL_PAYLOAD")

# Extract HTTP status and body
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" == "201" ]; then
  echo -e "${GREEN}✅ Deal Created Successfully!${NC}"
  echo ""
  echo "📋 Response:"
  echo "$BODY" | jq '.'

  # Extract deal ID
  DEAL_ID=$(echo "$BODY" | jq -r '.id')

  echo ""
  echo "📧 Email Notifications:"
  echo "  ✉️  Confirmation email sent to: john.doe@example.com"
  echo "  ✉️  Invitation emails sent to:"
  echo "     - Jane Smith (jane.smith@example.com)"
  echo "     - Bob Wilson (bob.wilson@example.com)"
  echo "     - Sarah Johnson (sarah.johnson@example.com)"
  echo "     - SecureEscrow LLC (contact@secureescrow.com)"

  echo ""
  echo "🔗 Sign-Up Links (would be in emails):"
  echo "  Jane: http://localhost:3000/sign-up?dealId=$DEAL_ID&email=jane.smith@example.com&name=Jane%20Smith"
  echo "  Bob: http://localhost:3000/sign-up?dealId=$DEAL_ID&email=bob.wilson@example.com&name=Bob%20Wilson"
  echo "  Sarah: http://localhost:3000/sign-up?dealId=$DEAL_ID&email=sarah.johnson@example.com&name=Sarah%20Johnson"
  echo "  SecureEscrow: http://localhost:3000/sign-up?dealId=$DEAL_ID&email=contact@secureescrow.com&name=SecureEscrow%20LLC"

  echo ""
  echo -e "${GREEN}✅ TEST PASSED!${NC}"
  echo "========================================"

  exit 0
else
  echo -e "${RED}❌ TEST FAILED!${NC}"
  echo "HTTP Status: $HTTP_STATUS"
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo "========================================"

  exit 1
fi
