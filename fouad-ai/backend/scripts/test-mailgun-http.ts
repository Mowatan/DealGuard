#!/usr/bin/env tsx
/**
 * Test Mailgun HTTP API
 *
 * Tests the Mailgun HTTP API configuration (not SMTP)
 */

import dotenv from 'dotenv';
import path from 'path';
import { emailService } from '../src/lib/email.service';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testMailgunHTTP() {
  console.log('🧪 Testing Mailgun HTTP API\n');

  // Display configuration
  console.log('Configuration:');
  console.log('  MAILGUN_API_KEY:', process.env.MAILGUN_API_KEY ?
    `✅ SET (${process.env.MAILGUN_API_KEY.substring(0, 8)}...)` :
    '❌ NOT SET');
  console.log('  MAILGUN_DOMAIN:', process.env.MAILGUN_DOMAIN || '❌ NOT SET');
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || 'DealGuard <noreply@dealguard.org>');
  console.log('  EMAIL_TEST_MODE:', process.env.EMAIL_TEST_MODE || 'false');
  console.log('  EMAIL_TEST_RECIPIENT:', process.env.EMAIL_TEST_RECIPIENT || '❌ NOT SET');
  console.log();

  // Validate configuration
  if (!process.env.MAILGUN_API_KEY || process.env.MAILGUN_API_KEY === 'YOUR_NEW_API_KEY_HERE') {
    console.error('❌ MAILGUN_API_KEY not configured!');
    console.error('\nPlease update your .env file with a valid Mailgun API key:');
    console.error('  MAILGUN_API_KEY=your-actual-api-key-here');
    console.error('\nGet your API key from: https://app.mailgun.com/app/account/security/api_keys');
    process.exit(1);
  }

  if (!process.env.MAILGUN_DOMAIN) {
    console.error('❌ MAILGUN_DOMAIN not configured!');
    console.error('\nPlease set MAILGUN_DOMAIN in your .env file');
    process.exit(1);
  }

  const testRecipient = process.env.EMAIL_TEST_RECIPIENT;
  if (!testRecipient) {
    console.error('❌ EMAIL_TEST_RECIPIENT not set!');
    process.exit(1);
  }

  console.log(`📧 Sending test email to: ${testRecipient}\n`);

  try {
    // Initialize and send test email
    emailService.initializeMailgun();

    const result = await emailService.sendEmail({
      to: testRecipient,
      subject: '✅ DealGuard Mailgun Test - Success!',
      template: 'deal-created',
      variables: {
        dealNumber: 'TEST-2026-001',
        dealTitle: 'Mailgun HTTP API Test',
        dealEmailAddress: 'test@mg.dealguard.org',
        yourRole: 'Administrator',
        createdAt: new Date().toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'short',
        }),
        partiesList: `
          <li style="margin-bottom: 8px;"><strong>Buyer:</strong> Test Buyer</li>
          <li style="margin-bottom: 8px;"><strong>Seller:</strong> Test Seller</li>
        `,
      },
      dealId: 'test-mailgun-http',
    });

    if (result.success) {
      console.log('\n✅ SUCCESS! Email sent via Mailgun HTTP API');
      console.log('   Message ID:', result.messageId);
      console.log('\n📬 Check your inbox:', testRecipient);
      console.log('\nNext steps:');
      console.log('  1. Check your email inbox');
      console.log('  2. If not received, check spam folder');
      console.log('  3. View logs at: https://app.mailgun.com/app/logs');
      process.exit(0);
    } else {
      console.error('\n❌ FAILED to send email');
      console.error('   Error:', result.error);
      console.error('\nTroubleshooting:');
      console.error('  1. Verify your API key is correct');
      console.error('  2. Check domain status: https://app.mailgun.com/app/sending/domains');
      console.error('  3. View error logs: https://app.mailgun.com/app/logs');
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
testMailgunHTTP();
