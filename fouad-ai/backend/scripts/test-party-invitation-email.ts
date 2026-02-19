#!/usr/bin/env tsx
/**
 * Test Party Invitation Email Template
 *
 * Tests that all template variables are properly replaced
 */

import { emailService } from '../src/lib/email.service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testPartyInvitationEmail() {
  console.log('🧪 Testing Party Invitation Email Template\n');

  const testRecipient = process.env.EMAIL_TEST_RECIPIENT || 'test@example.com';

  console.log('Configuration:');
  console.log('  Recipient:', testRecipient);
  console.log('  Email Test Mode:', process.env.EMAIL_TEST_MODE);
  console.log();

  // Initialize email service
  emailService.initializeMailgun();

  // Test data matching template variables
  const testVariables = {
    recipientName: 'John Doe',
    inviterName: 'Jane Smith',
    dealTitle: 'Commercial Property Sale Agreement',
    dealNumber: 'DG-2026-001',
    partyRole: 'BUYER',
    serviceTier: 'Premium',
    dealValue: '500,000',
    currency: 'USD',
    invitationUrl: 'https://dealguard.org/invitations/test-token-12345',
  };

  console.log('📧 Sending test email with variables:');
  console.log(JSON.stringify(testVariables, null, 2));
  console.log();

  try {
    const result = await emailService.sendEmail({
      to: testRecipient,
      subject: 'TEST: Party Invitation Email - Variable Rendering Test',
      template: 'party-invitation',
      variables: testVariables,
      dealId: 'test-deal-id',
    });

    if (result.success) {
      console.log('\n✅ SUCCESS! Email sent successfully');
      console.log('   Message ID:', result.messageId);
      console.log('\n📬 Check your inbox:', testRecipient);
      console.log('\n✓ Verification checklist:');
      console.log('  1. Email should say "Hello John Doe" (not {{recipientName}})');
      console.log('  2. Should show role badge "BUYER" (not {{partyRole}})');
      console.log('  3. Deal value should show "USD 500,000" (not {{currency}} {{dealValue}})');
      console.log('  4. All other variables should be replaced with actual values');
      console.log('\n⚠️  If you see ANY {{variables}}, the fix did not work!');
      process.exit(0);
    } else {
      console.error('\n❌ FAILED to send email');
      console.error('   Error:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Run test
testPartyInvitationEmail();
