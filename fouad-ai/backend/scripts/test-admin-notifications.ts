/**
 * Test Admin Email Notifications
 *
 * This script tests the admin notification system by:
 * 1. Simulating a new user signup notification
 * 2. Simulating a new deal creation notification
 *
 * Usage:
 *   npx ts-node scripts/test-admin-notifications.ts
 */

import { emailSendingQueue } from '../src/lib/queue';

async function testAdminNotifications() {
  console.log('🧪 Testing Admin Email Notifications\n');

  const adminEmail = process.env.ADMIN_EMAIL || 'trust@dealguard.org';
  console.log(`📧 Admin email: ${adminEmail}\n`);

  try {
    // Test 1: New User Signup Notification
    console.log('1️⃣ Testing NEW USER SIGNUP notification...');
    await emailSendingQueue.add('test-admin-new-user', {
      to: adminEmail,
      subject: `New User Signup - test.user@example.com`,
      template: 'admin-new-user',
      variables: {
        userName: 'Test User',
        userEmail: 'test.user@example.com',
        userId: 'test-user-id-123',
        clerkId: 'user_test_clerk_id_456',
        signupDate: new Date().toISOString(),
        signupTime: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
      },
    });
    console.log('✅ New user notification queued successfully\n');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: New Deal Creation Notification
    console.log('2️⃣ Testing NEW DEAL CREATION notification...');
    await emailSendingQueue.add('test-admin-new-deal', {
      to: adminEmail,
      subject: `New Deal Created - DEAL-2026-9999`,
      template: 'admin-new-deal',
      variables: {
        dealNumber: 'DEAL-2026-9999',
        dealTitle: 'Test Deal for Admin Notification System',
        dealId: 'test-deal-id-789',
        creatorName: 'Test Creator',
        creatorEmail: 'creator@example.com',
        serviceTier: 'GOVERNANCE_ADVISORY',
        totalAmount: '250000',
        currency: 'EGP',
        partiesCount: 3,
        milestonesCount: 5,
        createdAt: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }),
      },
    });
    console.log('✅ New deal notification queued successfully\n');

    console.log('🎉 All notifications queued successfully!');
    console.log(`\n📬 Check your inbox at: ${adminEmail}`);
    console.log('⏱️  Emails should arrive within 1-2 minutes\n');

    // Get queue stats
    const waitingCount = await emailSendingQueue.count();
    console.log(`📊 Queue Status: ${waitingCount} jobs waiting\n`);

  } catch (error) {
    console.error('❌ Error testing admin notifications:', error);
    process.exit(1);
  }

  // Keep process alive briefly to allow jobs to be picked up
  console.log('⏳ Waiting 5 seconds for worker to process jobs...');
  setTimeout(() => {
    console.log('✅ Test complete! You can now exit (Ctrl+C)');
    process.exit(0);
  }, 5000);
}

// Run the test
testAdminNotifications().catch(console.error);
