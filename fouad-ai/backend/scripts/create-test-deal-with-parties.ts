/**
 * Create Test Deal with Multiple Parties
 *
 * This script creates a test deal with multiple parties to test:
 * 1. Party invitation emails
 * 2. Admin notification emails
 * 3. Invitation links work correctly
 *
 * Usage:
 *   npx ts-node scripts/create-test-deal-with-parties.ts
 */

import { PrismaClient } from '@prisma/client';
import { emailSendingQueue } from '../src/lib/queue';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function createTestDeal() {
  console.log('🧪 Creating Test Deal with Parties...\n');

  try {
    // Step 1: Get or create a test user (deal creator)
    console.log('1️⃣ Getting test user...');
    let testUser = await prisma.user.findFirst({
      where: { email: 'test-creator@dealguard.org' },
    });

    if (!testUser) {
      console.log('   Creating test user...');
      testUser = await prisma.user.create({
        data: {
          email: 'test-creator@dealguard.org',
          name: 'Test Creator',
          passwordHash: '',
          role: 'PARTY_USER',
        },
      });
      console.log(`   ✅ Test user created: ${testUser.id}`);
    } else {
      console.log(`   ✅ Test user found: ${testUser.id}`);
    }

    // Step 2: Generate deal number
    console.log('\n2️⃣ Generating deal number...');
    const now = new Date();
    const year = now.getFullYear();
    const count = await prisma.deal.count();
    const dealNumber = `DEAL-${year}-${String(count + 1).padStart(4, '0')}`;
    console.log(`   ✅ Deal number: ${dealNumber}`);

    // Step 3: Create the deal with parties
    console.log('\n3️⃣ Creating deal with parties...');
    const dealId = crypto.randomUUID();
    const emailAddress = `deal-${dealId}@${process.env.INBOUND_EMAIL_DOMAIN || 'dealguard.org'}`;

    const deal = await prisma.deal.create({
      data: {
        id: dealId,
        dealNumber,
        title: 'Test Deal - Email & Invitation System Test',
        description: 'This is a test deal created to verify party invitation emails and invitation links work correctly.',
        emailAddress,
        status: 'CREATED',
        creatorId: testUser.id,
        transactionType: 'SIMPLE',
        currency: 'EGP',
        totalAmount: 100000,
        serviceTier: 'GOVERNANCE_ADVISORY',
        estimatedValue: 100000,
        serviceFee: 5000,
        parties: {
          create: [
            {
              role: 'BUYER',
              name: 'Test Buyer Party',
              contactEmail: 'test-buyer@dealguard.org',
              contactPhone: '+201234567890',
              isOrganization: false,
              partyType: 'INDIVIDUAL',
              invitationStatus: 'PENDING',
              invitationToken: crypto.randomBytes(32).toString('hex'),
            },
            {
              role: 'SELLER',
              name: 'Test Seller Party',
              contactEmail: 'test-seller@dealguard.org',
              contactPhone: '+201234567891',
              isOrganization: false,
              partyType: 'INDIVIDUAL',
              invitationStatus: 'PENDING',
              invitationToken: crypto.randomBytes(32).toString('hex'),
            },
            {
              role: 'AGENT',
              name: 'Test Agent Party',
              contactEmail: 'test-agent@dealguard.org',
              contactPhone: '+201234567892',
              isOrganization: true,
              partyType: 'BUSINESS',
              invitationStatus: 'PENDING',
              invitationToken: crypto.randomBytes(32).toString('hex'),
            },
          ],
        },
      },
      include: {
        parties: true,
      },
    });

    console.log(`   ✅ Deal created: ${deal.id}`);
    console.log(`   ✅ Deal number: ${deal.dealNumber}`);
    console.log(`   ✅ Parties created: ${deal.parties.length}`);

    // Step 4: Send invitation emails to all parties
    console.log('\n4️⃣ Sending invitation emails...');
    const baseUrl = process.env.FRONTEND_URL || 'https://dealguard.org';
    const creatorName = testUser.name || 'Test Creator';

    for (const party of deal.parties) {
      const confirmationLink = `${baseUrl}/confirm-invitation/${party.invitationToken}`;

      console.log(`\n   📧 Sending invitation to: ${party.contactEmail}`);
      console.log(`      Role: ${party.role}`);
      console.log(`      Link: ${confirmationLink}`);

      await emailSendingQueue.add(
        'send-party-invitation',
        {
          to: party.contactEmail,
          subject: `You've been invited to join a DealGuard transaction`,
          template: 'party-invitation',
          variables: {
            recipientName: party.name,
            inviterName: creatorName,
            dealTitle: deal.title,
            partyRole: party.role,
            dealNumber: deal.dealNumber,
            dealValue: deal.totalAmount?.toString() || 'TBD',
            currency: deal.currency || 'EGP',
            serviceTier: deal.serviceTier || 'GOVERNANCE_ADVISORY',
            invitationUrl: confirmationLink,
          },
          dealId: deal.id,
          priority: 5,
        },
        { priority: 5 }
      );

      console.log(`      ✅ Email queued`);
    }

    // Step 5: Send admin notification
    console.log('\n5️⃣ Sending admin notification...');
    const adminEmail = process.env.ADMIN_EMAIL || 'trust@dealguard.org';

    await emailSendingQueue.add('send-email', {
      to: adminEmail,
      subject: `New Deal Created - ${deal.dealNumber}`,
      template: 'admin-new-deal',
      variables: {
        dealNumber: deal.dealNumber,
        dealTitle: deal.title,
        dealId: deal.id,
        creatorName: testUser.name || 'Unknown',
        creatorEmail: testUser.email,
        serviceTier: deal.serviceTier,
        totalAmount: deal.totalAmount?.toString() || 'TBD',
        currency: deal.currency,
        partiesCount: deal.parties.length,
        milestonesCount: 0,
        createdAt: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
      },
    });

    console.log(`   ✅ Admin notification queued to: ${adminEmail}`);

    // Step 6: Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ TEST DEAL CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n📋 Deal Information:`);
    console.log(`   Deal ID: ${deal.id}`);
    console.log(`   Deal Number: ${deal.dealNumber}`);
    console.log(`   Title: ${deal.title}`);
    console.log(`   Amount: ${deal.currency} ${deal.totalAmount?.toString()}`);
    console.log(`   Service Tier: ${deal.serviceTier}`);
    console.log(`   Creator: ${testUser.name} (${testUser.email})`);

    console.log(`\n👥 Parties & Invitation Links:`);
    for (const party of deal.parties) {
      console.log(`\n   ${party.role} - ${party.name}`);
      console.log(`   Email: ${party.contactEmail}`);
      console.log(`   Invitation Link: ${baseUrl}/confirm-invitation/${party.invitationToken}`);
    }

    console.log(`\n📧 Emails Sent:`);
    console.log(`   ✅ ${deal.parties.length} party invitation emails queued`);
    console.log(`   ✅ 1 admin notification email queued`);
    console.log(`   Total: ${deal.parties.length + 1} emails`);

    console.log(`\n🧪 Testing Checklist:`);
    console.log(`   1. Check EMAIL_TEST_MODE environment variable`);
    console.log(`      If true, all emails go to EMAIL_TEST_RECIPIENT`);
    console.log(`      If false, emails go to actual recipients`);
    console.log(`   2. Check your email inbox (or test inbox)`);
    console.log(`   3. Verify invitation links don't have {{invitationToken}}`);
    console.log(`   4. Click an invitation link to test the flow`);
    console.log(`   5. Check admin inbox at ${adminEmail}`);

    console.log(`\n📊 Queue Status:`);
    const queueCount = await emailSendingQueue.count();
    console.log(`   ${queueCount} jobs in email queue`);

    console.log(`\n🔗 Quick Links:`);
    console.log(`   Deal Page: ${baseUrl}/deals/${deal.id}`);
    console.log(`   Buyer Invitation: ${baseUrl}/confirm-invitation/${deal.parties[0].invitationToken}`);
    console.log(`   Seller Invitation: ${baseUrl}/confirm-invitation/${deal.parties[1].invitationToken}`);
    console.log(`   Agent Invitation: ${baseUrl}/confirm-invitation/${deal.parties[2].invitationToken}`);

    console.log('\n✅ Script complete! Check logs for email sending status.\n');

  } catch (error) {
    console.error('❌ Error creating test deal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestDeal()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
