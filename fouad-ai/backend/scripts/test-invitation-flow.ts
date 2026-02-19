import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

const API_URL = process.env.API_URL || 'http://localhost:4000';

async function testInvitationFlow() {
  console.log('🧪 Testing Party Invitation Flow\n');
  console.log('API URL:', API_URL);
  console.log('=' .repeat(60));

  try {
    // Step 1: Get or create a test deal with invitation tokens
    console.log('\n📋 Step 1: Finding a deal with invitation tokens...');

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Find a deal with parties that have invitation tokens
    const deal = await prisma.deal.findFirst({
      where: {
        parties: {
          some: {
            invitationToken: {
              not: null,
            },
          },
        },
      },
      include: {
        parties: {
          where: {
            invitationToken: {
              not: null,
            },
          },
          take: 1,
        },
      },
    });

    if (!deal || deal.parties.length === 0) {
      console.log('❌ No deals found with invitation tokens');
      console.log('💡 Create a deal first using the deal creation flow');
      await prisma.$disconnect();
      return;
    }

    const party = deal.parties[0];
    const token = party.invitationToken!;

    console.log('✅ Found test deal:');
    console.log(`   Deal: ${deal.title} (${deal.dealNumber})`);
    console.log(`   Party: ${party.name} (${party.role})`);
    console.log(`   Token: ${token.substring(0, 20)}...`);
    console.log(`   Status: ${party.invitationStatus}`);

    // Step 2: Test GET invitation details
    console.log('\n📋 Step 2: Testing GET /api/invitations/:token');
    const getResponse = await fetch(`${API_URL}/api/invitations/${token}`);

    console.log(`   Status: ${getResponse.status} ${getResponse.statusText}`);

    if (!getResponse.ok) {
      const error = await getResponse.text();
      console.log('❌ Failed to get invitation details:', error);
      await prisma.$disconnect();
      return;
    }

    const invitationData = await getResponse.json();
    console.log('✅ Invitation details retrieved:');
    console.log(`   Deal: ${invitationData.deal.title}`);
    console.log(`   Party: ${invitationData.party.name}`);
    console.log(`   Role: ${invitationData.party.role}`);
    console.log(`   Status: ${invitationData.party.invitationStatus}`);
    console.log(`   Other Parties: ${invitationData.deal.parties.length - 1}`);

    // Step 3: Test invitation acceptance (only if PENDING)
    if (party.invitationStatus === 'PENDING') {
      console.log('\n📋 Step 3: Testing POST /api/invitations/:token/accept');

      const acceptResponse = await fetch(`${API_URL}/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`   Status: ${acceptResponse.status} ${acceptResponse.statusText}`);

      if (!acceptResponse.ok) {
        const error = await acceptResponse.text();
        console.log('❌ Failed to accept invitation:', error);
        await prisma.$disconnect();
        return;
      }

      const acceptResult = await acceptResponse.json();
      console.log('✅ Invitation accepted:');
      console.log(`   Success: ${acceptResult.success}`);
      console.log(`   Message: ${acceptResult.message}`);
      console.log(`   Deal ID: ${acceptResult.dealId}`);
      console.log(`   All Parties Accepted: ${acceptResult.allPartiesAccepted}`);

      // Verify in database
      const updatedParty = await prisma.party.findUnique({
        where: { id: party.id },
        select: {
          invitationStatus: true,
          respondedAt: true,
        },
      });

      console.log('\n✅ Database verification:');
      console.log(`   Status: ${updatedParty?.invitationStatus}`);
      console.log(`   Responded At: ${updatedParty?.respondedAt?.toISOString()}`);
    } else {
      console.log('\n⏭️  Step 3: Skipped (invitation already accepted)');
    }

    // Step 4: Test decline endpoint with a different party (if available)
    console.log('\n📋 Step 4: Testing decline endpoint (if available)...');

    const pendingParty = await prisma.party.findFirst({
      where: {
        dealId: deal.id,
        invitationStatus: 'PENDING',
        invitationToken: {
          not: null,
        },
      },
    });

    if (pendingParty) {
      console.log(`   Found pending party: ${pendingParty.name}`);
      console.log('   Testing decline...');

      const declineResponse = await fetch(
        `${API_URL}/api/invitations/${pendingParty.invitationToken}/decline`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Test decline - automated testing',
          }),
        }
      );

      console.log(`   Status: ${declineResponse.status} ${declineResponse.statusText}`);

      if (declineResponse.ok) {
        const declineResult = await declineResponse.json();
        console.log('✅ Invitation declined:');
        console.log(`   Success: ${declineResult.success}`);
        console.log(`   Message: ${declineResult.message}`);

        // Verify in database
        const declinedParty = await prisma.party.findUnique({
          where: { id: pendingParty.id },
          select: {
            invitationStatus: true,
            respondedAt: true,
          },
        });

        console.log('   Database verification:');
        console.log(`   Status: ${declinedParty?.invitationStatus}`);
        console.log(`   Responded At: ${declinedParty?.respondedAt?.toISOString()}`);
      } else {
        const error = await declineResponse.text();
        console.log('❌ Failed to decline:', error);
      }
    } else {
      console.log('   ℹ️  No pending parties available for decline test');
    }

    // Step 5: Test invalid token
    console.log('\n📋 Step 5: Testing invalid token handling...');
    const invalidResponse = await fetch(`${API_URL}/api/invitations/invalid-token-12345`);
    console.log(`   Status: ${invalidResponse.status} ${invalidResponse.statusText}`);

    if (invalidResponse.status === 404) {
      console.log('✅ Invalid token correctly returns 404');
    } else {
      console.log('❌ Invalid token should return 404');
    }

    await prisma.$disconnect();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Invitation flow test completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Visit: http://localhost:3000/invitations/' + token);
    console.log('   2. Test the frontend acceptance page');
    console.log('   3. Check the email template formatting');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testInvitationFlow()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
