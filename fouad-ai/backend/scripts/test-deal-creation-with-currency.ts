import axios from 'axios';

const API_URL = 'http://localhost:4000';

// Test user token - you'll need to replace this with a valid Clerk token
// Or use the test auth override if enabled
const TEST_USER_ID = 'test-user-1';
const TEST_SECRET = 'test-secret-67bddf9d630910410891f8bc3ae03b53';

async function testDealCreation() {
  console.log('🧪 Testing Deal Creation with Currency and Amount\n');

  // Test 1: Simple transaction with USD currency
  console.log('📝 Test 1: Creating SIMPLE transaction with USD...');
  try {
    console.log('   Request URL:', `${API_URL}/api/deals`);
    console.log('   Payload:', JSON.stringify({
      title: 'Test Simple Deal - USD',
      currency: 'USD',
      totalAmount: 50000.00,
    }, null, 2));
    const simplePayload = {
      title: 'Test Simple Deal - USD',
      description: 'Testing simple transaction with USD currency',
      transactionType: 'SIMPLE',
      currency: 'USD',
      totalAmount: 50000.00,
      parties: [
        {
          role: 'BUYER',
          name: 'John Buyer',
          isOrganization: false,
          contactEmail: 'buyer@test.com',
          contactPhone: '+1234567890',
        },
        {
          role: 'SELLER',
          name: 'Jane Seller',
          isOrganization: false,
          contactEmail: 'seller@test.com',
          contactPhone: '+0987654321',
        },
      ],
      userId: TEST_USER_ID,
      creatorName: 'Test Creator',
      creatorEmail: 'creator@test.com',
    };

    const response1 = await axios.post(`${API_URL}/api/deals`, simplePayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': TEST_USER_ID,
        'x-test-secret': TEST_SECRET,
      },
    });

    console.log('✅ Simple deal created successfully!');
    console.log(`   Deal ID: ${response1.data.id}`);
    console.log(`   Deal Number: ${response1.data.dealNumber}`);
    console.log(`   Currency: ${response1.data.currency}`);
    console.log(`   Total Amount: ${response1.data.totalAmount}`);
    console.log(`   Transaction Type: ${response1.data.transactionType}\n`);
  } catch (error: any) {
    console.error('❌ Test 1 failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('   Message:', error.message);
    console.error();
  }

  // Test 2: Milestone-based transaction with EUR currency
  console.log('📝 Test 2: Creating MILESTONE_BASED transaction with EUR...');
  try {
    const milestonePayload = {
      title: 'Test Milestone Deal - EUR',
      description: 'Testing milestone-based transaction with EUR currency',
      transactionType: 'MILESTONE_BASED',
      currency: 'EUR',
      parties: [
        {
          role: 'BUYER',
          name: 'Alice Buyer',
          isOrganization: false,
          contactEmail: 'alice@test.com',
        },
        {
          role: 'SELLER',
          name: 'Bob Seller',
          isOrganization: false,
          contactEmail: 'bob@test.com',
        },
      ],
      milestones: [
        {
          name: 'Initial Payment',
          description: 'First milestone payment',
          amount: '10000',
          deadline: '2024-12-31',
        },
        {
          name: 'Second Payment',
          description: 'Second milestone payment',
          amount: '15000',
        },
        {
          name: 'Final Payment',
          description: 'Final milestone payment',
          amount: '25000',
        },
      ],
      userId: TEST_USER_ID,
      creatorName: 'Test Creator',
      creatorEmail: 'creator@test.com',
    };

    const response2 = await axios.post(`${API_URL}/api/deals`, milestonePayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': TEST_USER_ID,
        'x-test-secret': TEST_SECRET,
      },
    });

    console.log('✅ Milestone deal created successfully!');
    console.log(`   Deal ID: ${response2.data.id}`);
    console.log(`   Deal Number: ${response2.data.dealNumber}`);
    console.log(`   Currency: ${response2.data.currency}`);
    console.log(`   Total Amount: ${response2.data.totalAmount}`);
    console.log(`   Transaction Type: ${response2.data.transactionType}`);

    // Fetch the deal to check milestones
    const dealResponse = await axios.get(`${API_URL}/api/deals/${response2.data.id}`, {
      headers: {
        'x-test-user-id': TEST_USER_ID,
        'x-test-secret': TEST_SECRET,
      },
    });

    if (dealResponse.data.contracts && dealResponse.data.contracts.length > 0) {
      const contract = dealResponse.data.contracts[0];
      console.log(`   Milestones: ${contract.milestones?.length || 0}`);
      contract.milestones?.forEach((m: any, idx: number) => {
        console.log(`     ${idx + 1}. ${m.name}: ${m.amount} ${m.currency}`);
      });
    }
    console.log();
  } catch (error: any) {
    console.error('❌ Test 2 failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('   Message:', error.message);
    console.error();
  }

  // Test 3: Simple transaction with EGP (default currency)
  console.log('📝 Test 3: Creating SIMPLE transaction with EGP (default)...');
  try {
    const egpPayload = {
      title: 'Test Simple Deal - EGP',
      description: 'Testing simple transaction with default EGP currency',
      transactionType: 'SIMPLE',
      currency: 'EGP',
      totalAmount: 1500000.00,
      parties: [
        {
          role: 'BUYER',
          name: 'Ahmed Buyer',
          isOrganization: false,
          contactEmail: 'ahmed@test.com',
        },
        {
          role: 'SELLER',
          name: 'Mohamed Seller',
          isOrganization: true,
          contactEmail: 'mohamed@test.com',
        },
      ],
      userId: TEST_USER_ID,
      creatorName: 'Test Creator',
      creatorEmail: 'creator@test.com',
    };

    const response3 = await axios.post(`${API_URL}/api/deals`, egpPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-id': TEST_USER_ID,
        'x-test-secret': TEST_SECRET,
      },
    });

    console.log('✅ EGP deal created successfully!');
    console.log(`   Deal ID: ${response3.data.id}`);
    console.log(`   Deal Number: ${response3.data.dealNumber}`);
    console.log(`   Currency: ${response3.data.currency}`);
    console.log(`   Total Amount: ${response3.data.totalAmount.toLocaleString()}`);
    console.log(`   Transaction Type: ${response3.data.transactionType}\n`);
  } catch (error: any) {
    console.error('❌ Test 3 failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('   Message:', error.message);
    console.error();
  }

  console.log('🎉 Testing complete!\n');
  console.log('Next steps:');
  console.log('1. Open http://localhost:3000/deals/new');
  console.log('2. Test the UI manually by creating deals with different currencies');
  console.log('3. Verify currency and amount fields are displayed correctly\n');
}

testDealCreation().catch((err) => {
  console.error('Fatal error:', err);
  console.error('Stack:', err.stack);
});
