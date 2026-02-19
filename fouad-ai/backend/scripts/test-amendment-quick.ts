/**
 * Quick Amendment & Deletion System Test
 * Tests the core functionality with simplified authentication
 */

import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

// ANSI colors
const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const blue = '\x1b[34m';
const reset = '\x1b[0m';

let authToken = '';
let testDealId = '';
let testPartyIds: string[] = [];

function log(msg: string, color = reset) {
  console.log(`${color}${msg}${reset}`);
}

function success(msg: string) {
  log(`✅ ${msg}`, green);
}

function error(msg: string) {
  log(`❌ ${msg}`, red);
}

function info(msg: string) {
  log(`ℹ️  ${msg}`, blue);
}

function section(msg: string) {
  log(`\n${'='.repeat(60)}`, blue);
  log(msg, blue);
  log('='.repeat(60), blue);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TEST: Create User and Login
// ============================================================================

async function setupTestUser() {
  section('Setting Up Test User');

  try {
    // Try to create a test user
    const email = `test-${Date.now()}@dealguard.com`;
    const password = 'TestPass123!';

    info('Creating test user...');
    try {
      await axios.post(`${API_BASE}/users/register`, {
        email,
        password,
        name: 'Test User',
        role: 'ADMIN',
      });
      success('Test user created');
    } catch (err: any) {
      if (err.response?.status === 409) {
        info('User already exists, will try to login');
      } else {
        throw err;
      }
    }

    // Login
    info('Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/users/login`, {
      email,
      password,
    });

    authToken = loginResponse.data.token;
    success('Authenticated successfully');

    return true;
  } catch (err: any) {
    error('Setup failed');
    console.error(err.response?.data || err.message);
    return false;
  }
}

// ============================================================================
// TEST: Phase 1 - Unilateral Update
// ============================================================================

async function testPhase1Update() {
  section('TEST 1: Phase 1 - Unilateral Update (No Agreements)');

  try {
    // Create a deal
    info('Creating test deal...');
    const createResponse = await axios.post(
      `${API_BASE}/deals`,
      {
        title: 'Test Deal - Amendment Test',
        description: 'Original description',
        transactionType: 'SIMPLE',
        totalAmount: 10000,
        currency: 'EGP',
        serviceTier: 'GOVERNANCE_ADVISORY',
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
        creatorEmail: 'test@dealguard.com',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    testDealId = createResponse.data.id;
    testPartyIds = createResponse.data.parties.map((p: any) => p.id);

    success(`Deal created: ${createResponse.data.dealNumber}`);
    info(`Deal ID: ${testDealId}`);

    await sleep(1000);

    // Try to update (should work - Phase 1)
    info('Attempting unilateral update...');
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

    success('✓ Deal updated successfully (Phase 1 - no approval needed)');
    info(`New title: ${updateResponse.data.title}`);
    info(`New amount: ${updateResponse.data.totalAmount}`);

    return true;
  } catch (err: any) {
    error('Phase 1 update test failed');
    console.error(err.response?.data || err.message);
    return false;
  }
}

// ============================================================================
// TEST: Phase 1 - Unilateral Delete
// ============================================================================

async function testPhase1Delete() {
  section('TEST 2: Phase 1 - Unilateral Delete (No Agreements)');

  try {
    // Create another deal
    info('Creating deal for deletion test...');
    const createResponse = await axios.post(
      `${API_BASE}/deals`,
      {
        title: 'Test Deal - Delete Test',
        description: 'Will be deleted',
        transactionType: 'SIMPLE',
        totalAmount: 5000,
        currency: 'EGP',
        serviceTier: 'GOVERNANCE_ADVISORY',
        parties: [
          {
            role: 'BUYER',
            name: 'Buyer Party',
            isOrganization: false,
            contactEmail: 'buyer2@test.com',
          },
          {
            role: 'SELLER',
            name: 'Seller Party',
            isOrganization: false,
            contactEmail: 'seller2@test.com',
          },
        ],
        creatorName: 'Test Creator',
        creatorEmail: 'test@dealguard.com',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const dealToDelete = createResponse.data.id;
    success(`Deal created: ${createResponse.data.dealNumber}`);

    await sleep(1000);

    // Try to delete (should work - Phase 1)
    info('Attempting unilateral delete...');
    const deleteResponse = await axios.delete(
      `${API_BASE}/deals/${dealToDelete}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { reason: 'Testing unilateral deletion' },
      }
    );

    success('✓ Deal deleted successfully (Phase 1 - no approval needed)');
    info(`Message: ${deleteResponse.data.message}`);

    return true;
  } catch (err: any) {
    error('Phase 1 delete test failed');
    console.error(err.response?.data || err.message);
    return false;
  }
}

// ============================================================================
// TEST: Phase 2 - Amendment Proposal
// ============================================================================

async function testPhase2Proposal() {
  section('TEST 3: Phase 2 - Amendment Proposal (With Agreements)');

  try {
    // First, accept the deal as a party
    info('Simulating party acceptance...');
    const dealResponse = await axios.get(`${API_BASE}/deals/${testDealId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const firstParty = dealResponse.data.parties[0];
    if (firstParty.invitationToken) {
      await axios.post(
        `${API_BASE}/deals/invitations/${firstParty.invitationToken}/confirm`
      );
      success('Party accepted - now in Phase 2');
    } else {
      info('⚠️  No invitation token - skipping Phase 2 tests');
      return false;
    }

    await sleep(1000);

    // Try direct update (should fail)
    info('Attempting direct update (should fail in Phase 2)...');
    try {
      await axios.patch(
        `${API_BASE}/deals/${testDealId}`,
        {
          title: 'This should not work',
          totalAmount: 99999,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      error('Direct update succeeded - this is wrong!');
      return false;
    } catch (err: any) {
      if (err.response?.data?.error?.includes('unilaterally')) {
        success('✓ Direct update blocked as expected');
      } else {
        throw err;
      }
    }

    await sleep(1000);

    // Propose amendment (should work)
    info('Proposing amendment...');
    const amendmentResponse = await axios.post(
      `${API_BASE}/deals/${testDealId}/amendments`,
      {
        proposedChanges: {
          title: 'Amended Title via Proposal',
          totalAmount: 20000,
        },
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    success('✓ Amendment proposal created');
    info(`Amendment ID: ${amendmentResponse.data.id}`);
    info(`Status: ${amendmentResponse.data.status}`);

    return true;
  } catch (err: any) {
    error('Phase 2 proposal test failed');
    console.error(err.response?.data || err.message);
    return false;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function runTests() {
  log('\n🧪 AMENDMENT & DELETION SYSTEM - QUICK TEST\n', yellow);

  const results: { test: string; passed: boolean }[] = [];

  // Setup
  const setupOk = await setupTestUser();
  if (!setupOk) {
    error('Setup failed - cannot continue');
    process.exit(1);
  }

  await sleep(1000);

  // Run tests
  results.push({
    test: 'Phase 1: Unilateral Update',
    passed: await testPhase1Update(),
  });

  await sleep(1000);

  results.push({
    test: 'Phase 1: Unilateral Delete',
    passed: await testPhase1Delete(),
  });

  await sleep(1000);

  results.push({
    test: 'Phase 2: Amendment Proposal',
    passed: await testPhase2Proposal(),
  });

  // Summary
  section('TEST RESULTS');

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

  log(`\n${'='.repeat(60)}`, blue);
  log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`, reset);
  log('='.repeat(60), blue);

  if (failed === 0) {
    log('\n🎉 ALL TESTS PASSED!\n', green);
  } else {
    log('\n⚠️  SOME TESTS FAILED\n', red);
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  error('Test crashed');
  console.error(err);
  process.exit(1);
});
