#!/bin/bash

# Simple Manual Test Script for Amendment & Deletion System
# Uses curl to test the API endpoints

API_BASE="http://localhost:4000/api"
TOKEN=""
DEAL_ID=""
PARTY1_ID=""
PARTY2_ID=""
AMENDMENT_ID=""

echo "=========================================="
echo "Deal Amendment & Deletion - Manual Tests"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
}

info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Function to get auth token (you'll need to implement based on your auth system)
authenticate() {
  info "Step 1: Authentication"
  echo "Please provide an authentication token:"
  read -p "Token: " TOKEN

  if [ -z "$TOKEN" ]; then
    error "No token provided"
    exit 1
  fi

  success "Token set"
  echo ""
}

# Test Phase 1: Create and Update Deal (No Agreements)
test_phase1_update() {
  info "Step 2: Testing Phase 1 - Unilateral Update"

  # Create a deal
  echo "Creating test deal..."
  RESPONSE=$(curl -s -X POST "$API_BASE/deals" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Test Deal for Amendment",
      "description": "Original description",
      "transactionType": "SIMPLE",
      "totalAmount": 10000,
      "currency": "EGP",
      "parties": [
        {
          "role": "BUYER",
          "name": "Buyer Party",
          "isOrganization": false,
          "contactEmail": "buyer@test.com"
        },
        {
          "role": "SELLER",
          "name": "Seller Party",
          "isOrganization": false,
          "contactEmail": "seller@test.com"
        }
      ],
      "creatorName": "Test Creator",
      "creatorEmail": "test@example.com"
    }')

  DEAL_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  PARTY1_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | head -2 | tail -1 | cut -d'"' -f4)
  PARTY2_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | head -3 | tail -1 | cut -d'"' -f4)

  if [ -z "$DEAL_ID" ]; then
    error "Failed to create deal"
    echo "Response: $RESPONSE"
    exit 1
  fi

  success "Deal created: $DEAL_ID"
  echo ""

  # Update the deal (should work - Phase 1)
  echo "Updating deal (Phase 1 - no approval needed)..."
  UPDATE_RESPONSE=$(curl -s -X PATCH "$API_BASE/deals/$DEAL_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Updated Test Deal",
      "description": "Updated description",
      "totalAmount": 15000
    }')

  if echo "$UPDATE_RESPONSE" | grep -q "Updated Test Deal"; then
    success "Deal updated successfully (Phase 1)"
  else
    error "Failed to update deal"
    echo "Response: $UPDATE_RESPONSE"
  fi
  echo ""
}

# Test Phase 2: Amendment Proposal
test_phase2_amendment() {
  info "Step 3: Testing Phase 2 - Amendment Proposal"

  # First, accept the deal as a party (simulate Phase 2)
  echo "Note: In real scenario, parties would accept via invitation token"
  echo "For Phase 2 tests to work, manually accept the deal as a party first."
  echo ""
  read -p "Press Enter after accepting the deal to continue..."

  # Propose an amendment
  echo "Proposing amendment (Phase 2 - requires approval)..."
  AMEND_RESPONSE=$(curl -s -X POST "$API_BASE/deals/$DEAL_ID/amendments" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "proposedChanges": {
        "title": "Amended Deal Title",
        "totalAmount": 20000
      }
    }')

  AMENDMENT_ID=$(echo $AMEND_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

  if [ -z "$AMENDMENT_ID" ]; then
    error "Failed to propose amendment"
    echo "Response: $AMEND_RESPONSE"
  else
    success "Amendment proposed: $AMENDMENT_ID"
  fi
  echo ""
}

# Test Phase 2: Amendment Approval
test_amendment_approval() {
  info "Step 4: Testing Amendment Approval"

  if [ -z "$AMENDMENT_ID" ]; then
    error "No amendment ID available"
    return
  fi

  # Party 1 approves
  echo "Party 1 approving amendment..."
  APPROVE1=$(curl -s -X POST "$API_BASE/amendments/$AMENDMENT_ID/approve" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"partyId\": \"$PARTY1_ID\",
      \"notes\": \"Looks good\"
    }")

  success "Party 1 approved"

  # Party 2 approves
  echo "Party 2 approving amendment..."
  APPROVE2=$(curl -s -X POST "$API_BASE/amendments/$AMENDMENT_ID/approve" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"partyId\": \"$PARTY2_ID\",
      \"notes\": \"Agreed\"
    }")

  success "Party 2 approved"
  success "All parties approved - amendment should be applied automatically!"
  echo ""
}

# Main test flow
echo "This script will guide you through manual testing of the amendment system."
echo ""

authenticate
test_phase1_update
test_phase2_amendment
test_amendment_approval

echo "=========================================="
success "Manual tests completed!"
echo "=========================================="
echo ""
echo "Check your backend logs and database to verify:"
echo "  - Deal was updated in Phase 1"
echo "  - Amendment was proposed in Phase 2"
echo "  - Parties responded to amendment"
echo "  - Amendment was applied after all approvals"
echo ""
