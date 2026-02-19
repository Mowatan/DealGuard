import { config } from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') });

async function getInvitationToken() {
  console.log('🔍 Finding invitation tokens for testing...\n');

  const prisma = new PrismaClient();

  try {
    // Find deals with pending invitations
    const deals = await prisma.deal.findMany({
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
        },
      },
      take: 3,
    });

    if (deals.length === 0) {
      console.log('❌ No deals found with invitation tokens');
      console.log('💡 Create a deal first using the deal creation flow');
      return;
    }

    console.log(`✅ Found ${deals.length} deal(s) with invitation tokens:\n`);

    deals.forEach((deal, idx) => {
      console.log(`${idx + 1}. Deal: ${deal.title} (${deal.dealNumber})`);
      console.log(`   Status: ${deal.status}`);
      console.log(`   Parties:\n`);

      deal.parties.forEach((party) => {
        console.log(`   👤 ${party.name}`);
        console.log(`      Role: ${party.role}`);
        console.log(`      Email: ${party.contactEmail}`);
        console.log(`      Status: ${party.invitationStatus}`);
        console.log(`      Token: ${party.invitationToken}`);
        console.log(`      \n      📧 Test email link:`);
        console.log(`      https://dealguard.org/invitations/${party.invitationToken}`);
        console.log(`      \n      🧪 Test API endpoint:`);
        console.log(`      curl http://localhost:4000/api/invitations/${party.invitationToken}`);
        console.log('');
      });

      console.log('─'.repeat(60));
    });

    console.log('\n📋 Manual Testing Steps:');
    console.log('1. Make sure backend is running: npm run dev');
    console.log('2. Test API endpoint with curl (see commands above)');
    console.log('3. Open frontend: npm run dev (in frontend directory)');
    console.log('4. Visit the invitation link in your browser');
    console.log('5. Click Accept/Decline and verify it works\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

getInvitationToken()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
