#!/usr/bin/env tsx
/**
 * Headless contract test for fouad.ai backend API
 * Tests authentication and key endpoints without browser
 */

import { createClerkClient } from '@clerk/backend';
import { prisma } from '../src/lib/prisma';
import 'dotenv/config';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const TEST_EMAIL = 'admin@fouad.ai';
const USE_FALLBACK_AUTH = process.env.NODE_ENV === 'development';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Get or create a test user and generate a session token
 */
async function getAuthToken(): Promise<{ token: string; clerkUserId: string }> {
  if (!CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY not found in environment');
  }

  try {
    // Initialize Clerk client
    const clerk = createClerkClient({
      secretKey: CLERK_SECRET_KEY,
    });

    // Find all users and use the first one
    console.log('Fetching Clerk users...');
    const userList = await clerk.users.getUserList({
      limit: 10,
    });

    if (userList.data.length === 0) {
      throw new Error('No users found in Clerk. Please create a user via Clerk dashboard first.');
    }

    // Use first user found
    const user = userList.data[0];
    const userEmail = user.emailAddresses[0]?.emailAddress || user.id;

    console.log(`Found ${userList.data.length} Clerk user(s)`);
    console.log(`Using Clerk user: ${user.id} (${userEmail})`);

    // Create a session for the user
    const session = await clerk.sessions.createSession({
      userId: user.id,
    });

    console.log(`Created session: ${session.id}`);

    // Get session token (JWT) - use default template
    const tokenResult = await clerk.sessions.getToken(session.id);

    // The token might be in a property
    const token = typeof tokenResult === 'string' ? tokenResult : tokenResult?.jwt || tokenResult?.token;

    if (!token) {
      throw new Error('Failed to get token from session');
    }

    console.log('✓ Generated Clerk JWT token');
    console.log(`Token method: Clerk sessions API (session.getToken)\n`);

    return { token: String(token), clerkUserId: user.id };
  } catch (error) {
    console.error('Failed to create auth token via Clerk:', error);
    throw error;
  }
}

/**
 * Execute a test request
 */
async function testEndpoint(
  endpoint: string,
  method: string,
  token?: string,
  body?: any,
  expectedStatus: number = 200
): Promise<TestResult> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const status = response.status;
    const passed = status === expectedStatus;

    let error: string | undefined;
    if (!passed) {
      try {
        const errorData = await response.json();
        error = errorData.message || JSON.stringify(errorData);
      } catch {
        error = await response.text();
      }
    }

    return {
      endpoint: `${method} ${endpoint}`,
      method,
      status,
      passed,
      error: passed ? undefined : error,
    };
  } catch (error) {
    return {
      endpoint: `${method} ${endpoint}`,
      method,
      status: 0,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run all contract tests
 */
async function runTests() {
  console.log('='.repeat(70));
  console.log('FOUAD.AI BACKEND CONTRACT TEST');
  console.log('='.repeat(70));
  console.log();

  // Step 1: Get auth token
  console.log('Step 1: Generating authentication token...');
  let token: string;
  let clerkUserId: string;
  try {
    const result = await getAuthToken();
    token = result.token;
    clerkUserId = result.clerkUserId;
  } catch (error) {
    console.error('FATAL: Could not generate auth token');
    console.error(error);
    process.exit(1);
  }

  console.log('Step 1b: Ensuring user exists in database with proper role...');
  try {
    // Make sure user exists with proper permissions
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      console.log('Creating user in database...');
      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: TEST_EMAIL,
          name: 'Test Admin',
          passwordHash: '',
          role: 'ADMIN',
        },
      });
    } else if (user.role === 'PARTY_USER') {
      console.log('Upgrading user role to ADMIN for testing...');
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
    }

    console.log(`Database user ready: ${user.email} (${user.role})\n`);
  } catch (error) {
    console.error('Failed to ensure user exists:', error);
  }

  console.log('Step 2: Running endpoint tests...\n');

  // Test 1: Health check (no auth)
  results.push(
    await testEndpoint('/health', 'GET', undefined, undefined, 200)
  );

  // Test 2: List deals and extract a deal ID
  let dealId: string | null = null;
  try {
    const listResponse = await fetch(`${API_BASE_URL}/api/deals?limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    results.push({
      endpoint: 'GET /api/deals?limit=5',
      method: 'GET',
      status: listResponse.status,
      passed: listResponse.status === 200,
    });

    if (listResponse.status === 200) {
      const listData = await listResponse.json();
      if (listData.deals && listData.deals.length > 0) {
        dealId = listData.deals[0].id;
      }
    }
  } catch (error) {
    results.push({
      endpoint: 'GET /api/deals?limit=5',
      method: 'GET',
      status: 0,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 3: Create deal (known issue: audit log actor foreign key)
  const createDealResult = await testEndpoint(
    '/api/deals',
    'POST',
    token,
    {
      title: 'Contract Test Deal',
      description: 'Created by automated contract test',
      parties: [
        {
          role: 'BUYER',
          name: 'Test Buyer',
          isOrganization: false,
          contactEmail: 'buyer@test.com',
        },
        {
          role: 'SELLER',
          name: 'Test Seller',
          isOrganization: false,
          contactEmail: 'seller@test.com',
        },
      ],
    },
    201
  );
  results.push(createDealResult);

  // Test 4: Get deal by ID (using existing deal)
  if (dealId) {
    results.push(
      await testEndpoint(`/api/deals/${dealId}`, 'GET', token, undefined, 200)
    );
  } else {
    results.push({
      endpoint: 'GET /api/deals/{id}',
      method: 'GET',
      status: 0,
      passed: false,
      error: 'Skipped: No deal ID available from list',
    });
  }

  // Test 5: Phase 2 - KYC pending (admin endpoint)
  results.push(
    await testEndpoint('/api/kyc/pending', 'GET', token, undefined, 200)
  );

  // Test 6: Phase 2 - Disputes open
  results.push(
    await testEndpoint('/api/disputes/open', 'GET', token, undefined, 200)
  );

  // Test 7: Phase 2 - Quarantined evidence
  results.push(
    await testEndpoint(
      '/api/evidence/quarantined',
      'GET',
      token,
      undefined,
      200
    )
  );

  console.log('\n' + '='.repeat(70));
  console.log('TEST RESULTS');
  console.log('='.repeat(70));
  console.log();

  // Print results table
  console.log(
    'ENDPOINT'.padEnd(40),
    'STATUS'.padEnd(8),
    'RESULT'
  );
  console.log('-'.repeat(70));

  results.forEach((result) => {
    const statusStr = result.status === 0 ? 'ERROR' : String(result.status);
    const resultStr = result.passed ? '✓ PASS' : '✗ FAIL';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(
      result.endpoint.padEnd(40),
      statusStr.padEnd(8),
      `${color}${resultStr}${reset}`
    );

    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });

  console.log('-'.repeat(70));

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log();
  console.log(`Total: ${passed}/${total} passed (${passRate}%)`);
  console.log();

  // Exit with error code if any tests failed
  if (passed < total) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
