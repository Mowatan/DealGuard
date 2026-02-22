#!/usr/bin/env tsx
/**
 * Test Milestone Email Templates
 *
 * This script tests all 5 milestone negotiation email templates:
 * 1. milestone-response-needed.html
 * 2. milestone-amendment-proposed.html
 * 3. milestone-rejected.html
 * 4. milestone-all-accepted.html
 * 5. deal-fully-negotiated.html
 *
 * Usage:
 *   npm run test:milestone-emails
 *
 * Or test specific template:
 *   npm run test:milestone-emails -- response-needed
 *   npm run test:milestone-emails -- amendment-proposed
 *   npm run test:milestone-emails -- rejected
 *   npm run test:milestone-emails -- all-accepted
 *   npm run test:milestone-emails -- fully-negotiated
 */

import { emailService } from '../src/lib/email.service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

interface TestTemplate {
  name: string;
  template: string;
  subject: string;
  variables: Record<string, any>;
  description: string;
}

const testTemplates: TestTemplate[] = [
  {
    name: 'Milestone Response Needed',
    template: 'milestone-response-needed',
    subject: 'Milestone Response: DEAL-2025-001',
    description: 'Notifies when a party responds to a milestone (ACCEPTED)',
    variables: {
      recipientName: 'John Buyer',
      partyName: 'Acme Seller Inc.',
      milestoneOrder: 1,
      milestoneTitle: 'Initial Payment',
      dealTitle: 'Website Development Agreement',
      dealNumber: 'DEAL-2025-001',
      currency: 'USD',
      amount: '5,000.00',
      responseType: 'ACCEPTED',
      notes: 'We agree to the terms of this milestone and are ready to proceed.',
      dealLink: 'http://localhost:3000/deals/test-deal-id',
    },
  },
  {
    name: 'Milestone Amendment Proposed',
    template: 'milestone-amendment-proposed',
    subject: 'Amendment Proposed: DEAL-2025-001',
    description: 'Alerts when a party proposes changes to milestone terms',
    variables: {
      recipientName: 'John Buyer',
      partyName: 'Acme Seller Inc.',
      milestoneOrder: 2,
      milestoneTitle: 'Final Delivery',
      dealTitle: 'Website Development Agreement',
      dealNumber: 'DEAL-2025-001',
      currency: 'USD',
      amount: '10,000.00',
      newAmount: '12,500.00',
      newDeadline: 'March 15, 2025',
      newDescription: 'Updated to include additional features: mobile responsive design, SEO optimization, and analytics integration',
      reason: 'The scope has expanded to include mobile optimization and additional integrations that were not in the original specification.',
      dealLink: 'http://localhost:3000/deals/test-deal-id',
    },
  },
  {
    name: 'Milestone Rejected',
    template: 'milestone-rejected',
    subject: 'Milestone Rejected: DEAL-2025-001',
    description: 'Notifies when a party rejects a milestone',
    variables: {
      recipientName: 'John Buyer',
      partyName: 'Acme Seller Inc.',
      milestoneOrder: 3,
      milestoneTitle: 'Beta Testing Phase',
      dealTitle: 'Website Development Agreement',
      dealNumber: 'DEAL-2025-001',
      currency: 'USD',
      amount: '3,000.00',
      notes: 'The timeline is too aggressive for proper testing. We need at least 2 additional weeks to conduct thorough QA and user acceptance testing.',
      dealLink: 'http://localhost:3000/deals/test-deal-id',
    },
  },
  {
    name: 'Milestone All Accepted',
    template: 'milestone-all-accepted',
    subject: 'Milestone Agreed: DEAL-2025-001',
    description: 'Celebrates when all parties accept a milestone',
    variables: {
      partyName: 'John Buyer',
      milestoneOrder: 1,
      milestoneTitle: 'Initial Payment',
      dealTitle: 'Website Development Agreement',
      dealNumber: 'DEAL-2025-001',
      currency: 'USD',
      amount: '5,000.00',
      allMilestonesApproved: false,
      remainingCount: 3,
      dealLink: 'http://localhost:3000/deals/test-deal-id',
    },
  },
  {
    name: 'Milestone All Accepted (Final)',
    template: 'milestone-all-accepted',
    subject: 'Milestone Agreed: DEAL-2025-001',
    description: 'Celebrates final milestone acceptance',
    variables: {
      partyName: 'John Buyer',
      milestoneOrder: 4,
      milestoneTitle: 'Project Completion',
      dealTitle: 'Website Development Agreement',
      dealNumber: 'DEAL-2025-001',
      currency: 'USD',
      amount: '7,500.00',
      allMilestonesApproved: true,
      remainingCount: 0,
      dealLink: 'http://localhost:3000/deals/test-deal-id',
    },
  },
  {
    name: 'Deal Fully Negotiated',
    template: 'deal-fully-negotiated',
    subject: 'Deal Activated: DEAL-2025-001',
    description: 'Announces deal activation after all milestones agreed',
    variables: {
      partyName: 'John Buyer',
      dealNumber: 'DEAL-2025-001',
      dealTitle: 'Website Development Agreement',
      milestonesCount: 4,
      activationDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      dealLink: 'http://localhost:3000/deals/test-deal-id',
    },
  },
];

async function sendTestEmail(template: TestTemplate, recipient: string): Promise<boolean> {
  console.log(`\n📧 Sending: ${template.name}`);
  console.log(`   Template: ${template.template}.html`);
  console.log(`   To: ${recipient}`);
  console.log(`   Description: ${template.description}`);

  try {
    const result = await emailService.sendEmail({
      to: recipient,
      subject: template.subject,
      template: template.template,
      variables: template.variables,
      dealId: 'test-deal-id',
    });

    if (result.success) {
      console.log(`   ✅ Sent successfully (ID: ${result.messageId})`);
      return true;
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  console.log('🧪 Milestone Email Templates Test\n');
  console.log('='.repeat(70));

  // Display configuration
  console.log('\nConfiguration:');
  console.log('  Mailgun API Key:', process.env.MAILGUN_API_KEY ? '✅ SET' : '❌ NOT SET');
  console.log('  Mailgun Domain:', process.env.MAILGUN_DOMAIN || '❌ NOT SET');
  console.log('  Email From:', process.env.EMAIL_FROM || 'DealGuard <noreply@dealguard.org>');
  console.log('  Test Recipient:', process.env.EMAIL_TEST_RECIPIENT || '❌ NOT SET');

  // Check configuration
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.error('\n❌ Mailgun configuration incomplete!');
    console.error('   Please set MAILGUN_API_KEY and MAILGUN_DOMAIN in your .env file');
    process.exit(1);
  }

  const testRecipient = process.env.EMAIL_TEST_RECIPIENT;
  if (!testRecipient) {
    console.error('\n❌ EMAIL_TEST_RECIPIENT not set!');
    console.error('   Please set EMAIL_TEST_RECIPIENT in your .env file');
    process.exit(1);
  }

  console.log('\n='.repeat(70));

  // Check for specific template argument
  const specificTemplate = process.argv[2];
  let templatesToTest = testTemplates;

  if (specificTemplate) {
    const found = testTemplates.filter(t =>
      t.template.includes(specificTemplate) ||
      t.name.toLowerCase().includes(specificTemplate.toLowerCase())
    );

    if (found.length === 0) {
      console.error(`\n❌ Template not found: ${specificTemplate}`);
      console.error('\nAvailable templates:');
      testTemplates.forEach(t => console.error(`  - ${t.template}`));
      process.exit(1);
    }

    templatesToTest = found;
    console.log(`\n🎯 Testing specific template(s): ${specificTemplate}`);
  } else {
    console.log(`\n🎯 Testing all ${testTemplates.length} milestone email templates`);
  }

  // Initialize email service
  emailService.initializeMailgun();

  // Send test emails
  let successCount = 0;
  let failCount = 0;

  for (const template of templatesToTest) {
    const success = await sendTestEmail(template, testRecipient);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Small delay between emails
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📧 Total emails sent to: ${testRecipient}`);

  console.log('\n📬 Check your inbox for the test emails!');
  console.log('\nWhat to verify:');
  console.log('  ✓ All emails arrived (check spam folder)');
  console.log('  ✓ Templates render correctly on desktop and mobile');
  console.log('  ✓ All variables are populated (no {{missing}} placeholders)');
  console.log('  ✓ Links are clickable and formatted properly');
  console.log('  ✓ DealGuard branding and colors display correctly');
  console.log('  ✓ Emojis render properly (📧 🎉 ✓ etc.)');
  console.log('  ✓ File sizes are reasonable (images load quickly)');

  console.log('\nTemplate Files Location:');
  console.log('  backend/templates/emails/milestone-*.html');
  console.log('  backend/templates/emails/deal-fully-negotiated.html');

  if (failCount > 0) {
    console.log('\n⚠️  Some emails failed to send. Check logs above for details.');
    process.exit(1);
  }

  console.log('\n✅ All tests completed successfully!\n');
  process.exit(0);
}

// Run the test
main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
