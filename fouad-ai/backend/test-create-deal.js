const fetch = require('node-fetch');

async function testCreateDeal() {
  const dealData = {
    title: 'Test Deal - Car Sale',
    description: 'Sale of a 2020 Toyota Camry in excellent condition',
    parties: [
      {
        role: 'BUYER',
        name: 'John Doe',
        isOrganization: false,
        contactEmail: 'john.doe@example.com',
        contactPhone: '+1 555-0100',
      },
      {
        role: 'SELLER',
        name: 'Jane Smith',
        isOrganization: false,
        contactEmail: 'jane.smith@example.com',
        contactPhone: '+1 555-0101',
      },
    ],
  };

  console.log('Creating test deal...');
  console.log('Payload:', JSON.stringify(dealData, null, 2));

  try {
    const response = await fetch('http://localhost:4000/api/deals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without a valid Clerk token
        // But we can see what error we get
      },
      body: JSON.stringify(dealData),
    });

    console.log('\nResponse status:', response.status);
    const result = await response.json();
    console.log('Response body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ Deal created successfully!');
      console.log('Deal ID:', result.id);
      console.log('Deal Number:', result.dealNumber);
    } else {
      console.log('\n❌ Failed to create deal');
      if (response.status === 401) {
        console.log('Note: This is expected - you need to be signed in with Clerk to create deals');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCreateDeal();
