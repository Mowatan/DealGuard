#!/usr/bin/env tsx
/**
 * Frontend UI contract smoke test
 * Verifies key API endpoints are reachable from frontend context
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

interface TestResult {
  endpoint: string;
  status: number;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

/**
 * Get auth token (reusing backend contract test approach)
 */
async function getAuthToken(): Promise<string> {
  if (!CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY not found. Set it in frontend/.env.local');
  }

  try {
    const { createClerkClient } = await import('@clerk/backend');
    const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

    const userList = await clerk.users.getUserList({ limit: 1 });
    if (userList.data.length === 0) {
      throw new Error('No Clerk users found');
    }

    const user = userList.data[0];
    const session = await clerk.sessions.createSession({ userId: user.id });
    const tokenResult = await clerk.sessions.getToken(session.id);
    const token = typeof tokenResult === 'string' ? tokenResult : (tokenResult as any)?.jwt;

    if (!token) {
      throw new Error('Failed to get token');
    }

    return String(token);
  } catch (error) {
    console.error('Failed to get auth token:', error);
    throw error;
  }
}

/**
 * Test endpoint
 */
async function testEndpoint(
  endpoint: string,
  token: string,
  expectedStatus: number = 200
): Promise<TestResult> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
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
      endpoint,
      status,
      passed,
      error: passed ? undefined : error,
    };
  } catch (error) {
    return {
      endpoint,
      status: 0,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run smoke tests
 */
async function runTests() {
  console.log('='.repeat(70));
  console.log('FRONTEND UI CONTRACT SMOKE TEST');
  console.log('='.repeat(70));
  console.log();

  console.log('Step 1: Generating auth token...');
  let token: string;
  try {
    token = await getAuthToken();
    console.log('✓ Token generated\n');
  } catch (error) {
    console.error('FATAL: Could not generate auth token');
    console.error(error);
    process.exit(1);
  }

  console.log('Step 2: Testing key endpoints...\n');

  // Test endpoints that frontend pages depend on
  results.push(await testEndpoint('/api/deals?limit=3', token));
  results.push(await testEndpoint('/api/kyc/pending', token));
  results.push(await testEndpoint('/api/disputes/open', token));
  results.push(await testEndpoint('/api/evidence/quarantined', token));

  console.log('='.repeat(70));
  console.log('TEST RESULTS');
  console.log('='.repeat(70));
  console.log();

  console.log('ENDPOINT'.padEnd(50), 'STATUS'.padEnd(8), 'RESULT');
  console.log('-'.repeat(70));

  results.forEach((result) => {
    const statusStr = result.status === 0 ? 'ERROR' : String(result.status);
    const resultStr = result.passed ? '✓ PASS' : '✗ FAIL';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(
      result.endpoint.padEnd(50),
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

  if (passed < total) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
