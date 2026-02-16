import { config } from 'dotenv';
import { emailService } from '../src/lib/email.service';

// Load environment variables
config();

async function testMailgun() {
  console.log('🧪 Testing Mailgun email sending...\n');

  try {
    // Initialize email service
    emailService.initializeTransporter();

    console.log('📧 Sending test email...');

    const result = await emailService.sendEmail({
      to: process.env.EMAIL_TEST_RECIPIENT || 'mohamedelwatan1@gmail.com',
      subject: 'DealGuard Email Test',
      template: 'deal-created',
      variables: {
        dealNumber: 'TEST-2025-001',
        dealTitle: 'Test Deal - Mailgun Integration',
        dealValue: '100,000 EGP',
        serviceTier: 'FINANCIAL_ESCROW',
        serviceFee: '3,000 EGP',
        parties: ['Mohamed El Watan', 'Test Party 2'],
        dealUrl: process.env.FRONTEND_URL + '/deals/test-123',
        yourRole: 'Buyer',
      }
    });

    console.log('\n' + '='.repeat(50));
    if (result.success) {
      console.log('✅ SUCCESS: Email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
      console.log('\n📬 Check your inbox at:', process.env.EMAIL_TEST_RECIPIENT || 'mohamedelwatan1@gmail.com');
      console.log('💡 Don\'t forget to check your spam folder!');
    } else {
      console.log('❌ FAILED: Could not send email');
      console.log('⚠️  Error:', result.error);
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check your .env file has correct SMTP credentials');
      console.log('   2. Verify your email is authorized in Mailgun dashboard');
      console.log('   3. Make sure SMTP_PASSWORD is set correctly');
    }
    console.log('='.repeat(50) + '\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\n🔧 Common issues:');
    console.log('   - Missing .env variables (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)');
    console.log('   - Unauthorized recipient (add your email in Mailgun dashboard)');
    console.log('   - Invalid SMTP credentials');
    console.log('   - Firewall blocking port 587\n');
  }

  process.exit(0);
}

testMailgun();
