/**
 * Test Invitation Flow End-to-End
 *
 * Usage: npx tsx scripts/test-invitation-flow.ts
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'https://api.dealguard.org';

async function testInvitationFlow() {
  console.log('\n🧪 TESTING INVITATION FLOW\n');
  console.log('═'.repeat(60));

  try {
    // Step 1: Find a test deal with pending invitations
    console.log('\n📋 Step 1: Finding test deal with pending invitations...\n');

    const deal = await prisma.deal.findFirst({
      where: {
        parties: {
          some: {
            invitationStatus: 'PENDING',
            invitationToken: { not: null },
          },
        },
      },
      include: {
        parties: {
          where: {
            invitationStatus: 'PENDING',
            invitationToken: { not: null },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!deal || deal.parties.length === 0) {
      console.log('❌ No test deal found with pending invitations');
      console.log('\n💡 To create a test deal:');
      console.log('   1. Go to https://dealguard.org/deals/new');
      console.log('   2. Create a deal with at least one party');
      console.log('   3. Run this test again\n');
      return;
    }

    const party = deal.parties[0];
    const token = party.invitationToken!;
    const invitationUrl = `https://dealguard.org/invitations/${token}`;

    console.log('✅ Found test deal:');
    console.log(`   Deal: ${deal.dealNumber} - ${deal.title}`);
    console.log(`   Party: ${party.name} (${party.role})`);
    console.log(`   Status: ${party.invitationStatus}`);
    console.log(`   Token: ${token.substring(0, 20)}...`);

    // Step 2: Test viewing invitation (public endpoint)
    console.log('\n📋 Step 2: Testing invitation viewing (public endpoint)...\n');

    const viewResponse = await axios.get(
      `${API_URL}/api/invitations/${token}`
    );

    console.log('✅ Invitation details fetched successfully:');
    console.log(`   Deal: ${viewResponse.data.deal.dealNumber}`);
    console.log(`   Party: ${viewResponse.data.party.name}`);
    console.log(`   Status: ${viewResponse.data.party.invitationStatus}`);

    // Step 3: Test acceptance WITHOUT auth (should fail with 401)
    console.log('\n📋 Step 3: Testing acceptance without auth (should fail)...\n');

    try {
      await axios.post(
        `${API_URL}/api/invitations/${token}/accept`,
        {}
      );
      console.log('❌ Should have rejected unauthenticated request!');
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected with 401 Unauthorized');
        console.log(`   Error: ${error.response.data.error}`);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Step 4: Show manual testing instructions
    console.log('\n' + '═'.repeat(60));
    console.log('\n🧪 MANUAL TESTING REQUIRED\n');
    console.log('To complete the full invitation flow test:\n');
    console.log('1. Open this URL in an INCOGNITO window:');
    console.log(`   ${invitationUrl}\n`);
    console.log('2. Click "Sign Up & Accept" button');
    console.log('3. Complete Clerk signup');
    console.log('4. You should auto-redirect to deal page');
    console.log('5. Look for success message: "Welcome to the deal!"');
    console.log('6. Check "My Deals" list\n');

    console.log('🔍 VERIFICATION:\n');
    console.log('After accepting, verify in database:');
    console.log(`\n  -- Check party status`);
    console.log(`  SELECT * FROM "Party" WHERE id = '${party.id}';\n`);
    console.log(`  -- Check party members`);
    console.log(`  SELECT * FROM "PartyMember" WHERE "partyId" = '${party.id}';\n`);
    console.log(`  -- Check audit logs`);
    console.log(`  SELECT * FROM "AuditLog" WHERE "dealId" = '${deal.id}' ORDER BY "createdAt" DESC;\n`);

    console.log('═'.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testInvitationFlow().catch(console.error);
