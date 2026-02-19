/**
 * Resend invitation emails for a deal
 * Useful when Redis queue wasn't available during deal creation
 */

import { prisma } from '../src/lib/prisma';
import { emailService } from '../src/lib/email.service';
import { InvitationStatus } from '@prisma/client';

async function resendInvitations(dealId: string) {
  console.log(`📧 Resending invitations for deal: ${dealId}\n`);

  try {
    // Fetch the deal with parties
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { parties: true },
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    console.log(`Deal: ${deal.title}`);
    console.log(`Deal Number: ${deal.dealNumber}\n`);

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Send invitations to pending parties
    for (const party of deal.parties) {
      if (party.invitationStatus !== InvitationStatus.PENDING) {
        console.log(`⏭️  Skipping ${party.name} - Status: ${party.invitationStatus}`);
        continue;
      }

      if (!party.invitationToken) {
        console.log(`❌ ${party.name} - No invitation token found`);
        continue;
      }

      const confirmationLink = `${baseUrl}/confirm-invitation/${party.invitationToken}`;

      console.log(`📧 Sending invitation to: ${party.name} (${party.contactEmail})`);

      const result = await emailService.sendEmail({
        to: party.contactEmail,
        subject: `You've been invited to join a DealGuard transaction`,
        template: 'party-invitation',
        variables: {
          invitedName: party.name,
          inviterName: 'DealGuard User',
          dealTitle: deal.title,
          dealDescription: deal.description || 'No description provided',
          yourRole: party.role,
          dealNumber: deal.dealNumber,
          totalAmount: deal.totalAmount?.toString() || 'TBD',
          currency: deal.currency || 'EGP',
          confirmationLink,
        },
        dealId: deal.id,
      });

      if (result.success) {
        console.log(`   ✅ Email sent - Message ID: ${result.messageId}`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
    }

    console.log('\n✨ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Get deal ID from command line argument
const dealId = process.argv[2];

if (!dealId) {
  console.error('Usage: npx tsx scripts/resend-invitations.ts <DEAL_ID>');
  process.exit(1);
}

resendInvitations(dealId)
  .then(() => {
    console.log('✅ Completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
