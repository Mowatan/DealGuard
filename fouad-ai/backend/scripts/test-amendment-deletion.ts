/**
 * Test Script for Deal Amendment & Deletion System
 *
 * Tests both Phase 1 (pre-agreement) and Phase 2 (post-agreement) workflows
 */

import axios from 'axios';

const API_BASE = process.env.API_URL || 'http://localhost:4000/api';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'password123';

let authToken = '';
let testUserId = '';
let testDealId = '';
let testPartyIds: string[] = [];
let amendmentId = '';
let deletionRequestId = '';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✅ ${message}`, colors.green);
}

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

function section(message: string) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(message, colors.cyan + colors.bright);
  log('='.repeat(60), colors.cyan);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function authenticate() {
  section('STEP 1: Authentication');

  try {
    // Try to get test user token
    info('Getting authentication token...');

    // For testing, we'll use the test override if available
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    authToken = response.data.token;
    testUserId = response.data.user.id;

    success(`Authenticated as ${TEST_USER_EMAIL}`);
    info(`User ID: ${testUserId}`);

    return true;
  } catch (err: any) {
    error('Authentication failed');
    console.error(err.response?.data || err.message);
    return false;
  }
}

// ============================================================================
// TEST PHASE 1: PRE-AGREEMENT (UNILATERAL ACTIONS)
// ============================================================================

async function testPhase1UnilateralUpdate() {
  section('PHASE 1 TEST: Unilateral Update (No Agreements)');

  try {
    // Create a test deal
    info('Creating test deal...');
    const createResponse = await axios.post(
      `${API_BASE}/deals`,
      {
        title: 'Test Deal for Amendment',
        description: 'Original description',
        transactionType: 'SIMPLE',
        totalAmount: 10000,
        currency: 'EGP',
        parties: [
          {
            role: 'BUYER',
            name: 'Buyer Party',
            isOrganization: false,
            contactEmail: 'buyer@test.com',
          },
          {
            role: 'SELLER',
            name: 'Seller Party',
            isOrganization: false,
            contactEmail: 'seller@test.com',
          },
        ],
        creatorName: 'Test Creator',
        creatorEmail: TEST_USER_EMAIL,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    testDealId = createResponse.data.id;
    testPartyIds = createResponse.data.parties.map((p: any) => p.id);

    success(`Deal created: ${createResponse.data.dealNumber}`);
    info(`Deal ID: ${testDealId}`);

    // Wait a moment
    await sleep(1000);

    // Try to update the deal (should work - Phase 1)
    info('Attempting unilateral update (should succeed)...');
    const updateResponse = await axios.patch(
      `${API_BASE}/deals/${testDealId}`,
      {
        title: 'Updated Test Deal',
        description: 'Updated description',
        totalAmount: 15000,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    success('Deal updated successfully (Phase 1 - no approval needed)');
    info(`New title: ${updateResponse.data.title}`);
    info(`New amount: ${updateResponse.data.totalAmount}`);

    return true;
  } catch (err: any) {
    error('Phase 1 unilateral update failed');
    console.error(err.response?.data || err.message);
    return false;
  }
}

async function testPhase1UnilateralDelete() {
  section('PHASE 1 TEST: Unilateral Delete (No Agreements)');

  try {
    // Create another test deal
    info('Creating test deal for deletion...');
    const createResponse = await axios.post(
      `${API_BASE}/deals`,
      {
        title: 'Test Deal for Deletion',
        description: 'Will be deleted',
        transactionType: 'SIMPLE',
        totalAmount: 5000,
        currency: 'EGP',
        parties: [
          {
            role: 'BUYER',
            name: 'Buyer Party',
            isOrganization: false,
            contactEmail: 'buyer@test.com',
          },
          {
            role: 'SELLER',
            name: 'Seller Party',
            isOrganization: false,
            contactEmail: 'seller@test.com',
          },
        ],
        creatorName: 'Test Creator',
        creatorEmail: TEST_USER_EMAIL,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const dealIdToDelete = createResponse.data.id;
    success(`Deal created: ${createResponse.data.dealNumber}`);

    // Wait a moment
    await sleep(1000);

    // Try to delete the deal (should work - Phase 1)
    info('Attempting unilateral delete (should succeed)...');
    const deleteResponse = await axios.delete(
      `${API_BASE}/deals/${dealIdToDelete}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { reason: 'Testing unilateral deletion' },
      }
    );

    success('Deal deleted successfully (Phase 1 - no approval needed)');
    info(`Message: ${deleteResponse.data.message}`);

    return true;
  } catch (err: any) {
    error('Phase 1 unilateral delete failed');
    console.error(err.response?.data || err.message);
    return false;
  }
}

// ============================================================================
// TEST PHASE 2: POST-AGREEMENT (PROPOSAL SYSTEM)
// ============================================================================

async function simulatePartyAcceptance() {
  section('SIMULATING PARTY ACCEPTANCE');

  try {
    info('Simulating party acceptance to enter Phase 2...');

    // Note: In a real scenario, parties would accept via invitation tokens
    // For testing, we'll directly update the party status in the database
    // or use the invitation confirmation endpoint if available

    info('Getting party invitation token...');
    const dealResponse = await axios.get(
      `${API_BASE}/deals/${testDealId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const firstParty = dealResponse.data.parties[0];
    info(`Party: ${firstParty.name} (${firstParty.invitationStatus})`);

    if (firstParty.invitationToken) {
      info('Accepting invitation via token...');
      await axios.post(
        `${API_BASE}/deals/invitations/${firstParty.invitationToken}/confirm`
      );
      success('Party accepted the deal - now in Phase 2');
    } else {
      info('⚠️  No invitation token available - deal remains in Phase 1');
      info('Note: In production, parties would accept via email invitation');
    }

    return true;
  } catch (err: any) {
    error('Failed to simulate party acceptance');
    console.error(err.response?.data || err.message);
    return false;
  }
}

async function testPhase2AmendmentProposal() {
  section('PHASE 2 TEST: Amendment Proposal');

  try {
    info('Proposing amendment (Phase 2 - requires approval)...');
    const response = await axios.post(
      `${API_BASE}/deals/${testDealId}/amendments`,
      {
        proposedChanges: {
          title: 'Amended Deal Title',
          description: 'Amended description after agreement',
          totalAmount: 20000,
        },
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    amendmentId = response.data.id;
    success('Amendment proposal created');
    info(`Amendment ID: ${amendmentId}`);
    info(`Status: ${response.data.status}`);
    info(`Proposed by: ${response.data.proposedByName}`);

    return true;
  } catch (err: any) {
    error('Amendment proposal failed');
    console.error(err.response?.data || err.message);
    return false;
  }
}

async function testPhase2AmendmentApproval() {
  section('PHASE 2 TEST: Party Approves Amendment');

  try {
    info('Party 1 approving amendment...');
    const response = await axios.post(
      `${API_BASE}/amendments/${amendmentId}/approve`,
      {
        partyId: testPartyIds[0],
        notes: 'Looks good to me',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    success('Party 1 approved the amendment');
    info(`Response type: ${response.data.responseType}`);

    // Approve with second party
    await sleep(1000);

    info('Party 2 approving amendment...');
    const response2 = await axios.post(
      `${API_BASE}/amendments/${amendmentId}/approve`,
      {
        partyId: testPartyIds[1],
        notes: 'Agreed',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    success('Party 2 approved the amendment');
    info('All parties approved - amendment should be automatically applied!');

    return true;
  } catch (err: any) {
    error('Amendment approval failed');
    console.error(err.response?.data || err.message);
    return false;
  }
}

async function testPhase2AmendmentDispute() {
  section('PHASE 2 TEST: Party Disputes Amendment');

  try {
    // Create a new amendment to dispute
    info('Creating new amendment for dispute test...');
    const createResponse = await axios.post(
      `${API_BASE}/deals/${testDealId}/amendments`,
      {
        proposedChanges: {
          totalAmount: 50000, // Unreasonable amount
        },
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const newAmendmentId = createResponse.data.id;
    success('Amendment proposal created');

    await sleep(1000);

    info('Party 1 disputing amendment...');
    const response = await axios.post(
      `${API_BASE}/amendments/${newAmendmentId}/dispute`,
      {
        partyId: testPartyIds[0],
        notes: 'The amount is too high and unreasonable',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    success('Party disputed the amendment');
    info(`Response type: ${response.data.responseType}`);
    info('Amendment should now be escalated to admin for resolution');

    return true;
  } catch (err: any) {
    error('Amendment dispute failed');
    console.error(err.response?.data || err.message);
    return false;
  }
}

async function testPhase2DeletionProposal() {
  section('PHASE 2 TEST: Deletion Proposal');

  try {
    info('Proposing deletion (Phase 2 - requires approval)...');
    const response = await axios.post(
      `${API_BASE}/deals/${testDealId}/deletion-request`,
      {
        reason: 'Both parties agreed to cancel the deal',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    deletionRequestId = response.data.id;
    success('Deletion request created');
    info(`Deletion Request ID: ${deletionRequestId}`);
    info(`Status: ${response.data.status}`);
    info(`Reason: ${response.data.reason}`);

    return true;
  } catch (err: any) {
    error('Deletion proposal failed');
    console.error(err.response?.data || err.message);
    return false;
  }
}

async function testPhase2DeletionApproval() {
  section('PHASE 2 TEST: All Parties Approve Deletion');

  try {
    info('Party 1 approving deletion...');
    await axios.post(
      `${API_BASE}/deletion-requests/${deletionRequestId}/approve`,
      {
        partyId: testPartyIds[0],
        notes: 'Agreed to cancel',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    success('Party 1 approved deletion');

    await sleep(1000);

    info('Party 2 approving deletion...');
    await axios.post(
      `${API_BASE}/deletion-requests/${deletionRequestId}/approve`,
      {
        partyId: testPartyIds[1],
        notes: 'Confirmed',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    success('Party 2 approved deletion');
    info('All parties approved - deal should be automatically deleted!');

    // Try to fetch the deal (should fail)
    await sleep(1000);
    try {
      await axios.get(`${API_BASE}/deals/${testDealId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      error('Deal still exists (unexpected)');
      return false;
    } catch (err: any) {
      if (err.response?.status === 404) {
        success('Deal successfully deleted after approval');
        return true;
      }
      throw err;
    }
  } catch (err: any) {
    error('Deletion approval test failed');
    console.error(err.response?.data || err.message);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  section('🧪 DEAL AMENDMENT & DELETION SYSTEM TEST SUITE');

  log('\nThis script will test:', colors.yellow);
  log('  - Phase 1: Unilateral updates and deletions (no agreements)', colors.yellow);
  log('  - Phase 2: Proposal system with party approval (after agreements)', colors.yellow);
  log('  - Dispute escalation workflow\n', colors.yellow);

  const results: { test: string; passed: boolean }[] = [];

  // Authentication
  const authSuccess = await authenticate();
  if (!authSuccess) {
    error('Authentication failed - cannot continue tests');
    process.exit(1);
  }

  // Phase 1 Tests
  results.push({
    test: 'Phase 1: Unilateral Update',
    passed: await testPhase1UnilateralUpdate(),
  });

  await sleep(1000);

  results.push({
    test: 'Phase 1: Unilateral Delete',
    passed: await testPhase1UnilateralDelete(),
  });

  // Simulate party acceptance to enter Phase 2
  await sleep(1000);
  const acceptanceSuccess = await simulatePartyAcceptance();

  if (acceptanceSuccess) {
    // Phase 2 Tests
    await sleep(1000);
    results.push({
      test: 'Phase 2: Amendment Proposal',
      passed: await testPhase2AmendmentProposal(),
    });

    await sleep(1000);
    results.push({
      test: 'Phase 2: Amendment Approval',
      passed: await testPhase2AmendmentApproval(),
    });

    await sleep(1000);
    results.push({
      test: 'Phase 2: Amendment Dispute',
      passed: await testPhase2AmendmentDispute(),
    });

    await sleep(1000);
    results.push({
      test: 'Phase 2: Deletion Proposal',
      passed: await testPhase2DeletionProposal(),
    });

    await sleep(1000);
    results.push({
      test: 'Phase 2: Deletion Approval',
      passed: await testPhase2DeletionApproval(),
    });
  } else {
    info('⚠️  Skipping Phase 2 tests (party acceptance simulation failed)');
  }

  // Summary
  section('TEST RESULTS SUMMARY');

  let passed = 0;
  let failed = 0;

  results.forEach((result) => {
    if (result.passed) {
      success(`${result.test}`);
      passed++;
    } else {
      error(`${result.test}`);
      failed++;
    }
  });

  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`Total Tests: ${results.length}`, colors.bright);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
  log('='.repeat(60), colors.cyan);

  if (failed === 0) {
    log('\n🎉 ALL TESTS PASSED!', colors.green + colors.bright);
  } else {
    log('\n⚠️  SOME TESTS FAILED', colors.red + colors.bright);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((err) => {
  error('Test suite crashed');
  console.error(err);
  process.exit(1);
});
