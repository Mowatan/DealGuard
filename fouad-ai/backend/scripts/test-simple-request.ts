import axios from 'axios';

const API_URL = 'http://localhost:4000';
const TEST_USER_ID = 'test-user-1';
const TEST_SECRET = 'test-secret-67bddf9d630910410891f8bc3ae03b53';

async function testSimpleRequest() {
  console.log('Testing simple API request...\n');

  try {
    console.log('1. Testing health/ping endpoint...');
    const pingResponse = await axios.get(`${API_URL}/health`).catch(err => {
      console.log('  Health check failed:', err.code, err.message);
      return null;
    });

    if (pingResponse) {
      console.log('  ✅ Server is responding:', pingResponse.status);
    } else {
      console.log('  ❌ Server is not responding\n');
      console.log('  Trying to connect anyway...\n');
    }

    console.log('2. Testing POST /api/deals with currency and amount...');
    const payload = {
      title: 'Test Deal',
      description: 'Testing',
      transactionType: 'SIMPLE',
      currency: 'USD',
      totalAmount: 1000,
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
      userId: TEST_USER_ID,
      creatorName: 'Test Creator',
      creatorEmail: 'creator@test.com',
    };

    console.log('  Sending request...');
    const response = await axios.post(`${API_URL}/api/deals`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': TEST_USER_ID,
        'x-test-secret': TEST_SECRET,
      },
      timeout: 10000,
    });

    console.log('  ✅ Success!');
    console.log('  Status:', response.status);
    console.log('  Deal created:');
    console.log('    - ID:', response.data.id);
    console.log('    - Number:', response.data.dealNumber);
    console.log('    - Currency:', response.data.currency);
    console.log('    - Total Amount:', response.data.totalAmount);
    console.log('    - Transaction Type:', response.data.transactionType);

  } catch (error: any) {
    console.error('\n❌ Test failed!');

    if (error.response) {
      console.error('  Response error:');
      console.error('    Status:', error.response.status);
      console.error('    Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('  No response received from server');
      console.error('    Error code:', error.code);
      console.error('    Message:', error.message);
      console.error('    Is Axios Error:', error.isAxiosError);
    } else {
      console.error('  Request setup error:', error.message);
    }

    if (error.stack) {
      console.error('\n  Stack trace:', error.stack);
    }
  }
}

testSimpleRequest();
