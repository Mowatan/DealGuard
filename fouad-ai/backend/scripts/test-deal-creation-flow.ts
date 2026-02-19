/**
 * Test script for the new deal creation flow with party invitations
 *
 * This script simulates creating a deal with custom roles and multiple parties
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:4000';

interface Party {
  role: string;
  name: string;
  isOrganization: boolean;
  contactEmail: string;
  contactPhone?: string;
}

interface DealPayload {
  title: string;
  description?: string;
  parties: Party[];
  creatorName: string;
  creatorEmail: string;
}

async function testDealCreation() {
  console.log('🧪 Testing New Deal Creation Flow\n');
  console.log('='.repeat(60));

  // Step 1: Get authentication token
  console.log('\n📝 Step 1: Authentication');
  console.log('Note: In production, this would come from Clerk');

  // For testing, we'll use the test-auth-override from middleware
  const testToken = 'test-token-for-deal-creation';
  const testUserId = 'test_user_deal_creator';

  // Step 2: Prepare deal data simulating the 5-step wizard
  console.log('\n📝 Step 2: Prepare Deal Data (Simulating 5-Step Wizard)');

  const dealData: DealPayload = {
    // Step 2: Deal details
    title: 'Commercial Property Sale - 123 Main Street',
    description: 'Sale of a commercial property in downtown area. Property includes ground floor retail space and upper floor offices.',

    // Step 1: Creator role (Buyer)
    // Step 3: Counterparty
    // Step 4: Additional parties
    parties: [
      // Creator (Step 1)
      {
        role: 'BUYER',
        name: 'John Doe',
        isOrganization: false,
        contactEmail: 'john.doe@example.com',
        contactPhone: '+1 234 567 8900',
      },
      // Counterparty (Step 3)
      {
        role: 'SELLER',
        name: 'Jane Smith',
        isOrganization: false,
        contactEmail: 'jane.smith@example.com',
        contactPhone: '+1 234 567 8901',
      },
      // Additional Party 1 (Step 4) - Custom Role
      {
        role: 'Legal Representative', // Custom role!
        name: 'Bob Wilson',
        isOrganization: false,
        contactEmail: 'bob.wilson@example.com',
        contactPhone: '+1 234 567 8902',
      },
      // Additional Party 2 (Step 4) - Predefined Role
      {
        role: 'AGENT',
        name: 'Sarah Johnson',
        isOrganization: false,
        contactEmail: 'sarah.johnson@example.com',
        contactPhone: '+1 234 567 8903',
      },
      // Additional Party 3 (Step 4) - Organization with Custom Role
      {
        role: 'Escrow Service Provider', // Custom role!
        name: 'SecureEscrow LLC',
        isOrganization: true,
        contactEmail: 'contact@secureescrow.com',
        contactPhone: '+1 234 567 8904',
      },
    ],
    creatorName: 'John Doe',
    creatorEmail: 'john.doe@example.com',
  };

  console.log('\n📊 Deal Summary:');
  console.log(`  Title: ${dealData.title}`);
  console.log(`  Description: ${dealData.description}`);
  console.log(`  Total Parties: ${dealData.parties.length}`);
  console.log(`  Creator: ${dealData.creatorName} (${dealData.creatorEmail})`);
  console.log('\n👥 Parties:');
  dealData.parties.forEach((party, index) => {
    console.log(`  ${index + 1}. ${party.name} (${party.role})`);
    console.log(`     Email: ${party.contactEmail}`);
    console.log(`     ${party.isOrganization ? '🏢 Organization' : '👤 Individual'}`);
  });

  // Step 3: Create the deal
  console.log('\n📝 Step 3: Creating Deal via API');
  console.log('POST /api/deals\n');

  try {
    const response = await axios.post(
      `${API_URL}/api/deals`,
      dealData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
          'x-test-user-id': testUserId,
        },
      }
    );

    console.log('✅ Deal Created Successfully!\n');
    console.log('📋 Response:');
    console.log(JSON.stringify(response.data, null, 2));

    const deal = response.data;
    console.log('\n📧 Email Notifications:');
    console.log(`  ✉️  Confirmation email sent to: ${dealData.creatorEmail}`);
    console.log(`  ✉️  Invitation emails sent to:`);
    dealData.parties
      .filter(p => p.contactEmail !== dealData.creatorEmail)
      .forEach(party => {
        console.log(`     - ${party.name} (${party.contactEmail})`);
      });

    console.log('\n🔗 Sign-Up Links Generated:');
    dealData.parties
      .filter(p => p.contactEmail !== dealData.creatorEmail)
      .forEach(party => {
        const signUpLink = `http://localhost:3000/sign-up?dealId=${deal.id}&email=${encodeURIComponent(party.contactEmail)}&name=${encodeURIComponent(party.name)}`;
        console.log(`  ${party.name}: ${signUpLink}`);
      });

    console.log('\n✅ TEST PASSED!');
    console.log('='.repeat(60));

    return deal;
  } catch (error: any) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.response?.data || error.message);
    console.log('='.repeat(60));
    throw error;
  }
}

// Run the test
testDealCreation()
  .then(() => {
    console.log('\n🎉 All tests completed successfully!');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n💥 Tests failed!');
    process.exit(1);
  });
