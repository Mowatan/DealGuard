#!/usr/bin/env tsx
/**
 * Test Deal Creation with Email Notifications
 *
 * This script creates a test deal and verifies that email notifications are sent to all parties.
 *
 * Usage:
 *   npm run test:deal-email
 *
 * Prerequisites:
 *   - Backend server must be running (npm run dev)
 *   - Redis must be running (email queue)
 *   - SMTP must be configured in .env
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_URL = process.env.API_URL || 'http://localhost:4000';
const TEST_EMAIL = process.env.EMAIL_TEST_RECIPIENT;

interface Party {
  role: string;
  name: string;
  contactEmail: string;
}

async function getAuthToken(): Promise<string> {
  // For testing, we'll use the contract test auth
  if (process.env.ENABLE_CONTRACT_TEST_AUTH === 'true') {
    return process.env.CONTRACT_TEST_SECRET || '';
  }

  console.error('❌ Authentication not configured for testing');
  console.error('   Set ENABLE_CONTRACT_TEST_AUTH=true and CONTRACT_TEST_SECRET in .env');
  process.exit(1);
}

async function createTestDeal(token: string) {
  console.log('🔨 Creating test deal...\n');

  const parties: Party[] = [
    {
      role: 'Buyer',
      name: 'Test Buyer',
      contactEmail: TEST_EMAIL || 'buyer@example.com',
    },
    {
      role: 'Seller',
      name: 'Test Seller',
      contactEmail: TEST_EMAIL || 'seller@example.com',
    },
  ];

  const dealData = {
    title: `Email Test Deal - ${new Date().toISOString()}`,
    description: 'This is a test deal to verify email notifications are working correctly.',
    totalAmount: 10000,
    currency: 'USD',
    parties,
    milestones: [
      {
        title: 'Initial Milestone',
        description: 'First milestone for testing',
        amount: 5000,
        currency: 'USD',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        order: 1,
      },
      {
        title: 'Final Milestone',
        description: 'Final milestone for testing',
        amount: 5000,
        currency: 'USD',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
        order: 2,
      },
    ],
  };

  console.log('Deal Details:');
  console.log('  Title:', dealData.title);
  console.log('  Amount:', `${dealData.totalAmount} ${dealData.currency}`);
  console.log('  Parties:', parties.map(p => `${p.role} (${p.contactEmail})`).join(', '));
  console.log();

  try {
    const response = await fetch(`${API_URL}/api/deals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(dealData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const deal = await response.json();
    console.log('✅ Deal created successfully!');
    console.log('   Deal Number:', deal.dealNumber);
    console.log('   Deal ID:', deal.id);
    console.log('   Email Address:', deal.emailAddress);
    console.log();

    return deal;
  } catch (error) {
    console.error('❌ Failed to create deal:', error);
    throw error;
  }
}

async function waitForEmailProcessing() {
  console.log('⏳ Waiting for email queue to process...');
  console.log('   (Email sending happens asynchronously via Redis queue)');

  // Wait 5 seconds for the email queue to process
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log();
}

async function main() {
  console.log('🧪 Deal Creation + Email Notification Test\n');
  console.log('='.repeat(60));
  console.log();

  // Check configuration
  console.log('Configuration Check:');
  console.log('  API URL:', API_URL);
  console.log('  SMTP Host:', process.env.SMTP_HOST || '❌ NOT SET');
  console.log('  SMTP User:', process.env.SMTP_USER || '❌ NOT SET');
  console.log('  Email From:', process.env.EMAIL_FROM || 'DealGuard <noreply@dealguard.org>');
  console.log('  Test Mode:', process.env.EMAIL_TEST_MODE || 'false');
  console.log('  Test Recipient:', TEST_EMAIL || '❌ NOT SET');
  console.log();

  if (!TEST_EMAIL) {
    console.error('❌ EMAIL_TEST_RECIPIENT not set in .env');
    console.error('   Set this to your email address to receive test notifications');
    process.exit(1);
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('❌ SMTP configuration incomplete!');
    console.error('   Please configure Mailgun in your .env file');
    console.error('   See MAILGUN_SETUP_DEALGUARD.md for instructions');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log();

  try {
    // Get auth token
    const token = await getAuthToken();

    // Create test deal
    const deal = await createTestDeal(token);

    // Wait for email processing
    await waitForEmailProcessing();

    // Success summary
    console.log('✅ Test Completed Successfully!\n');
    console.log('Expected Outcome:');
    console.log(`  📧 You should receive ${deal.parties.length} email(s) at: ${TEST_EMAIL}`);
    console.log('  📬 Subject: "New Deal Created: ' + deal.dealNumber + '"');
    console.log('  📝 Email will contain:');
    console.log('      - Deal number and title');
    console.log('      - Your role (Buyer/Seller)');
    console.log('      - Deal email address: ' + deal.emailAddress);
    console.log('      - List of all parties');
    console.log();
    console.log('If you don\'t receive the email:');
    console.log('  1. Check spam/junk folder');
    console.log('  2. Check backend logs for email queue errors');
    console.log('  3. Verify Redis is running: redis-cli ping');
    console.log('  4. Check Mailgun dashboard logs');
    console.log('  5. Run: npm run test:email (to test SMTP directly)');
    console.log();

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure backend server is running: npm run dev');
    console.error('  2. Ensure Redis is running: redis-cli ping');
    console.error('  3. Check .env configuration');
    console.error('  4. Check backend logs for errors');
    process.exit(1);
  }
}

main();
