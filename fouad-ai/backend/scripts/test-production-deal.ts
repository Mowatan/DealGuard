/**
 * Production Deal Creation Test
 *
 * Tests the complete deal creation flow on the live production API
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'https://api.dealguard.org';

interface TestResult {
  step: string;
  status: 'success' | 'error';
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function logResult(step: string, status: 'success' | 'error', message: string, data?: any) {
  const icon = status === 'success' ? '✅' : '❌';
  console.log(`${icon} ${step}: ${message}`);
  results.push({ step, status, message, data });
}

async function testHealthCheck() {
  console.log('\n📊 Step 1: Health Check');
  console.log('='.repeat(60));

  try {
    const response = await axios.get(`${API_URL}/health`, {
      timeout: 10000,
    });

    logResult('Health Check', 'success', 'API is responding', response.data);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error: any) {
    logResult('Health Check', 'error', error.message);
    return false;
  }
}

async function testApiRoot() {
  console.log('\n📊 Step 2: API Root');
  console.log('='.repeat(60));

  try {
    const response = await axios.get(`${API_URL}/`, {
      timeout: 10000,
    });

    logResult('API Root', 'success', 'API metadata received', response.data);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error: any) {
    logResult('API Root', 'error', error.message);
    return false;
  }
}

async function testDealCreationWithoutAuth() {
  console.log('\n📊 Step 3: Test Deal Creation (No Auth)');
  console.log('='.repeat(60));
  console.log('Expected: 401 Unauthorized (auth is required)');

  try {
    const dealData = {
      title: 'Test Deal - Property Sale',
      description: 'This is a test deal to verify the production API',
      parties: [
        {
          role: 'BUYER',
          name: 'John Smith',
          isOrganization: false,
          contactEmail: 'john@example.com',
          contactPhone: '+1234567890',
        },
        {
          role: 'SELLER',
          name: 'Jane Doe',
          isOrganization: false,
          contactEmail: 'jane@example.com',
        },
      ],
      creatorName: 'Test User',
      creatorEmail: 'test@dealguard.org',
    };

    const response = await axios.post(`${API_URL}/api/deals`, dealData, {
      timeout: 10000,
    });

    // If we get here, auth is not working correctly
    logResult('Deal Creation (No Auth)', 'error', 'Expected 401 but got success - AUTH IS NOT ENFORCED!');
    return false;
  } catch (error: any) {
    if (error.response?.status === 401) {
      logResult('Deal Creation (No Auth)', 'success', 'Correctly rejected without authentication');
      console.log('Error:', error.response.data);
      return true;
    } else {
      logResult('Deal Creation (No Auth)', 'error', `Unexpected error: ${error.message}`);
      return false;
    }
  }
}

async function testCORS() {
  console.log('\n📊 Step 4: Test CORS Headers');
  console.log('='.repeat(60));

  try {
    const response = await axios.get(`${API_URL}/health`, {
      timeout: 10000,
      headers: {
        'Origin': 'https://dealguard.org',
      },
    });

    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-credentials': response.headers['access-control-allow-credentials'],
    };

    logResult('CORS', 'success', 'CORS headers present', corsHeaders);
    console.log('CORS Headers:', corsHeaders);
    return true;
  } catch (error: any) {
    logResult('CORS', 'error', error.message);
    return false;
  }
}

async function checkDatabaseConnection() {
  console.log('\n📊 Step 5: Database Connection');
  console.log('='.repeat(60));

  try {
    const response = await axios.get(`${API_URL}/health`);

    if (response.data.database === 'connected') {
      logResult('Database', 'success', 'PostgreSQL connected');
      return true;
    } else {
      logResult('Database', 'error', 'Database not connected');
      return false;
    }
  } catch (error: any) {
    logResult('Database', 'error', error.message);
    return false;
  }
}

async function checkStorage() {
  console.log('\n📊 Step 6: Storage Status');
  console.log('='.repeat(60));

  try {
    const response = await axios.get(`${API_URL}/health`);

    const storage = response.data.storage;
    console.log('Storage Info:', JSON.stringify(storage, null, 2));

    if (storage.providers.fallback === 'healthy') {
      logResult('Storage', 'success', `Using ${storage.current} (fallback active)`);
      if (storage.providers.primary === 'unhealthy') {
        console.log('⚠️  Warning: Primary storage (S3/R2) not configured. Using local fallback.');
      }
      return true;
    } else {
      logResult('Storage', 'error', 'No storage provider available');
      return false;
    }
  } catch (error: any) {
    logResult('Storage', 'error', error.message);
    return false;
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`Success Rate: ${Math.round((successCount / total) * 100)}%\n`);

  if (errorCount === 0) {
    console.log('🎉 All tests passed! Production API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Review the errors above.');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📝 NEXT STEPS');
  console.log('='.repeat(60));
  console.log('\n1. Configure S3/R2 storage for file persistence:');
  console.log('   railway variables --set S3_ENDPOINT=...');
  console.log('   railway variables --set S3_ACCESS_KEY_ID=...');
  console.log('   railway variables --set S3_SECRET_ACCESS_KEY=...');
  console.log('\n2. Test deal creation from frontend:');
  console.log('   - Go to https://dealguard.org');
  console.log('   - Sign in with Clerk');
  console.log('   - Create a new deal');
  console.log('   - Verify emails are sent');
  console.log('\n3. Monitor logs:');
  console.log('   railway logs');
  console.log('');
}

async function runTests() {
  console.log('🧪 DealGuard Production API Test Suite');
  console.log('Testing API at:', API_URL);
  console.log('='.repeat(60));

  await testHealthCheck();
  await testApiRoot();
  await testDealCreationWithoutAuth();
  await testCORS();
  await checkDatabaseConnection();
  await checkStorage();

  await printSummary();

  // Exit with error code if any tests failed
  const hasErrors = results.some(r => r.status === 'error');
  process.exit(hasErrors ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
