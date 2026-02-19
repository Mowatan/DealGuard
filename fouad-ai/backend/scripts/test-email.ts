#!/usr/bin/env tsx
/**
 * Test Email Service
 *
 * This script tests the email service configuration and sends a test email.
 *
 * Usage:
 *   npm run test:email
 *
 * Or with custom recipient:
 *   EMAIL_TEST_RECIPIENT="your-email@example.com" npm run test:email
 */

import { emailService } from '../src/lib/email.service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testEmail() {
  console.log('🧪 Testing Email Service Configuration\n');

  // Display current configuration
  console.log('Configuration:');
  console.log('  SMTP Host:', process.env.SMTP_HOST || '❌ NOT SET');
  console.log('  SMTP Port:', process.env.SMTP_PORT || '❌ NOT SET');
  console.log('  SMTP User:', process.env.SMTP_USER || '❌ NOT SET');
  console.log('  SMTP Password:', process.env.SMTP_PASSWORD ? '✅ SET' : '❌ NOT SET');
  console.log('  Email From:', process.env.EMAIL_FROM || 'DealGuard <noreply@dealguard.org>');
  console.log('  Test Mode:', process.env.EMAIL_TEST_MODE || 'false');
  console.log('  Test Recipient:', process.env.EMAIL_TEST_RECIPIENT || '❌ NOT SET');
  console.log();

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('❌ SMTP configuration incomplete!');
    console.error('   Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in your .env file');
    console.error('   See MAILGUN_SETUP_DEALGUARD.md for setup instructions');
    process.exit(1);
  }

  // Determine recipient
  const testRecipient = process.env.EMAIL_TEST_RECIPIENT;
  if (!testRecipient) {
    console.error('❌ EMAIL_TEST_RECIPIENT not set!');
    console.error('   Please set EMAIL_TEST_RECIPIENT in your .env file');
    process.exit(1);
  }

  console.log(`📧 Sending test email to: ${testRecipient}\n`);

  try {
    // Initialize the email service
    emailService.initializeTransporter();

    // Send test email using deal-created template
    const result = await emailService.sendEmail({
      to: testRecipient,
      subject: 'DealGuard Email Test - Configuration Successful',
      template: 'deal-created',
      variables: {
        dealNumber: 'TEST-2025-001',
        dealTitle: 'Test Deal for Email Configuration',
        dealEmailAddress: 'test-deal-001@dealguard.org',
        yourRole: 'Buyer',
        createdAt: new Date().toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'short',
        }),
        partiesList: `
          <li style="margin-bottom: 8px;"><strong>Buyer:</strong> Test Buyer (buyer@example.com)</li>
          <li style="margin-bottom: 8px;"><strong>Seller:</strong> Test Seller (seller@example.com)</li>
        `,
      },
      dealId: 'test-deal-id',
    });

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log('   Message ID:', result.messageId);
      console.log('\n📬 Check your inbox at:', testRecipient);
      console.log('\nIf you don\'t see the email:');
      console.log('  1. Check your spam/junk folder');
      console.log('  2. Verify your Mailgun domain is verified');
      console.log('  3. Check Mailgun dashboard logs');
      console.log('  4. Ensure your domain DNS records are configured correctly');
      process.exit(0);
    } else {
      console.error('❌ Failed to send email:', result.error);
      console.error('\nTroubleshooting:');
      console.error('  1. Verify SMTP credentials in .env file');
      console.error('  2. Check Mailgun dashboard for domain status');
      console.error('  3. Ensure domain is verified (not in sandbox mode)');
      console.error('  4. Check network connectivity to smtp.mailgun.org:587');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testEmail();
