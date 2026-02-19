/**
 * List deals for testing
 *
 * Usage: npx tsx scripts/list-deals.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listDeals() {
  console.log('📋 Listing deals...\n');

  try {
    const deals = await prisma.deal.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        parties: {
          select: {
            id: true,
            name: true,
            role: true,
            invitationStatus: true,
          },
        },
        milestones: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        _count: {
          select: {
            parties: true,
            milestones: true,
          },
        },
      },
    });

    if (deals.length === 0) {
      console.log('No deals found in database\n');
      return;
    }

    console.log(`Found ${deals.length} deal(s):\n`);
    console.log('═══════════════════════════════════════════════════\n');

    deals.forEach((deal, idx) => {
      console.log(`${idx + 1}. Deal #${deal.dealNumber}`);
      console.log(`   ID: ${deal.id}`);
      console.log(`   Title: ${deal.title}`);
      console.log(`   Status: ${deal.status}`);
      console.log(`   Creator: ${deal.creator?.name || 'Unknown'} (${deal.creator?.email || 'N/A'})`);
      console.log(`   Amount: ${deal.currency || 'USD'} ${deal.totalAmount || 0}`);
      console.log(`   Parties: ${deal._count.parties}`);

      const acceptedParties = deal.parties.filter(p => p.invitationStatus === 'ACCEPTED').length;
      const pendingParties = deal.parties.filter(p => p.invitationStatus === 'PENDING').length;
      console.log(`     - Accepted: ${acceptedParties}`);
      console.log(`     - Pending: ${pendingParties}`);

      console.log(`   Milestones: ${deal._count.milestones}`);

      if (deal.milestones.length > 0) {
        const completedMilestones = deal.milestones.filter(m => m.status === 'APPROVED').length;
        console.log(`     - Completed: ${completedMilestones}`);
        console.log(`     - Pending: ${deal.milestones.length - completedMilestones}`);
      }

      console.log(`   Created: ${deal.createdAt.toISOString()}`);
      console.log();
    });

    console.log('═══════════════════════════════════════════════════\n');
    console.log('To test progress endpoint, run:\n');
    console.log(`npx tsx scripts/test-progress-endpoint.ts ${deals[0].id}\n`);

  } catch (error) {
    console.error('❌ Error listing deals:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listDeals();
