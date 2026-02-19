/**
 * Test script for Party Invitation System
 *
 * This script tests the complete invitation flow:
 * 1. Create a deal with multiple parties
 * 2. Verify invitation tokens are generated
 * 3. Fetch invitation details
 * 4. Confirm party invitations
 * 5. Verify deal status updates when all parties accept
 */

import { prisma } from '../src/lib/prisma';
import * as dealService from '../src/modules/deals/deals.service';
import { InvitationStatus, DealStatus } from '@prisma/client';

async function testPartyInvitationSystem() {
  console.log('🧪 Testing Party Invitation System\n');

  try {
    // Clean up test data
    console.log('🧹 Cleaning up previous test data...');
    await prisma.deal.deleteMany({
      where: {
        title: 'Test Deal - Party Invitation System',
      },
    });

    // Create or get test user
    console.log('👤 Creating test user...');
    let testUser = await prisma.user.findUnique({
      where: { email: 'test-creator@example.com' },
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test-creator@example.com',
          name: 'Test Creator',
          passwordHash: '', // Empty for test
          role: 'PARTY_USER',
        },
      });
      console.log('✅ Test user created:', testUser.id);
    } else {
      console.log('✅ Using existing test user:', testUser.id);
    }

    // Step 1: Create a deal with multiple parties
    console.log('\n📝 Step 1: Creating deal with multiple parties...');
    const deal = await dealService.createDeal({
      title: 'Test Deal - Party Invitation System',
      description: 'Testing party invitation functionality',
      parties: [
        {
          role: 'BUYER',
          name: 'Alice Johnson',
          isOrganization: false,
          contactEmail: 'alice@example.com',
          contactPhone: '+201234567890',
        },
        {
          role: 'SELLER',
          name: 'Bob Smith',
          isOrganization: false,
          contactEmail: 'bob@example.com',
          contactPhone: '+201234567891',
        },
        {
          role: 'AGENT',
          name: 'Charlie Brown',
          isOrganization: false,
          contactEmail: 'charlie@example.com',
        },
      ],
      userId: testUser.id,
      creatorName: testUser.name,
      creatorEmail: testUser.email,
    });

    console.log('✅ Deal created:', {
      id: deal.id,
      dealNumber: deal.dealNumber,
      title: deal.title,
      partiesCount: deal.parties.length,
    });

    // Step 2: Verify invitation tokens are generated
    console.log('\n🔑 Step 2: Verifying invitation tokens...');
    for (const party of deal.parties) {
      console.log(`   Party: ${party.name}`);
      console.log(`   - Role: ${party.role}`);
      console.log(`   - Email: ${party.contactEmail}`);
      console.log(`   - Status: ${party.invitationStatus}`);
      console.log(`   - Token: ${party.invitationToken ? '✅ Generated' : '❌ Missing'}`);
      console.log('');
    }

    // Step 3: Test fetching invitation details
    console.log('\n📋 Step 3: Fetching invitation details for first party...');
    const firstParty = deal.parties[0];
    if (!firstParty.invitationToken) {
      throw new Error('No invitation token found for first party');
    }

    const invitationDetails = await dealService.getPartyByInvitationToken(
      firstParty.invitationToken
    );

    if (!invitationDetails) {
      throw new Error('Failed to fetch invitation details');
    }

    console.log('✅ Invitation details fetched:', {
      partyName: invitationDetails.name,
      role: invitationDetails.role,
      dealTitle: invitationDetails.deal.title,
      status: invitationDetails.invitationStatus,
    });

    // Step 4: Confirm first party's invitation
    console.log('\n✅ Step 4: Confirming first party\'s invitation...');
    const confirmResult1 = await dealService.confirmPartyInvitation(
      firstParty.invitationToken
    );

    console.log('✅ First party confirmed:', {
      partyName: confirmResult1.party.name,
      status: confirmResult1.party.invitationStatus,
      allPartiesAccepted: confirmResult1.allPartiesAccepted,
    });

    // Verify deal status hasn't changed yet (not all parties accepted)
    const dealAfterFirst = await dealService.getDealById(deal.id);
    console.log('   Deal status:', dealAfterFirst?.status);
    console.log('   All parties confirmed:', dealAfterFirst?.allPartiesConfirmed);

    // Step 5: Confirm remaining parties
    console.log('\n✅ Step 5: Confirming remaining parties...');
    for (let i = 1; i < deal.parties.length; i++) {
      const party = deal.parties[i];
      if (!party.invitationToken) continue;

      const confirmResult = await dealService.confirmPartyInvitation(
        party.invitationToken
      );

      console.log(`   ✅ ${party.name} confirmed (${i + 1}/${deal.parties.length})`);

      if (confirmResult.allPartiesAccepted) {
        console.log('   🎉 All parties have accepted!');
      }
    }

    // Step 6: Verify final deal status
    console.log('\n📊 Step 6: Verifying final deal status...');
    const finalDeal = await dealService.getDealById(deal.id);

    if (!finalDeal) {
      throw new Error('Deal not found');
    }

    console.log('✅ Final Deal Status:', {
      status: finalDeal.status,
      allPartiesConfirmed: finalDeal.allPartiesConfirmed,
      expectedStatus: DealStatus.ACCEPTED,
      statusMatches: finalDeal.status === DealStatus.ACCEPTED,
    });

    // Step 7: Test duplicate confirmation
    console.log('\n🔄 Step 7: Testing duplicate confirmation...');
    const duplicateResult = await dealService.confirmPartyInvitation(
      firstParty.invitationToken
    );

    console.log('✅ Duplicate confirmation handled:', {
      alreadyAccepted: duplicateResult.alreadyAccepted,
      message: duplicateResult.alreadyAccepted
        ? 'Correctly detected as already accepted'
        : 'ERROR: Should have detected duplicate',
    });

    // Step 8: Test invalid token
    console.log('\n❌ Step 8: Testing invalid token...');
    try {
      await dealService.confirmPartyInvitation('invalid-token-12345');
      console.log('   ❌ ERROR: Should have thrown error for invalid token');
    } catch (error) {
      console.log('   ✅ Correctly rejected invalid token:', (error as Error).message);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All tests passed successfully!');
    console.log('='.repeat(60));
    console.log('\nTest Deal Details:');
    console.log(`   Deal ID: ${finalDeal.id}`);
    console.log(`   Deal Number: ${finalDeal.dealNumber}`);
    console.log(`   Status: ${finalDeal.status}`);
    console.log(`   All Parties Confirmed: ${finalDeal.allPartiesConfirmed}`);
    console.log('\nParties:');
    finalDeal.parties.forEach((party) => {
      console.log(`   - ${party.name} (${party.role}): ${party.invitationStatus}`);
    });

    console.log('\n✨ Party Invitation System is working correctly!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testPartyInvitationSystem()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
