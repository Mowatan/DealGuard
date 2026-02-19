/**
 * Email Send Test
 * Tests sending an actual email using the email service
 */

import { config } from 'dotenv';
import nodemailer from 'nodemailer';

config();

async function testEmailSend() {
  console.log('\n=== Testing Email Send ===\n');

  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  };

  console.log('Configuration:');
  console.log('  Host:', smtpConfig.host);
  console.log('  Port:', smtpConfig.port);
  console.log('  From:', process.env.EMAIL_FROM);
  console.log('  To:', process.env.EMAIL_TEST_RECIPIENT);
  console.log('  Test Mode:', process.env.EMAIL_TEST_MODE);

  try {
    console.log('\nCreating transporter...');
    const transporter = nodemailer.createTransport(smtpConfig);

    console.log('Verifying connection...');
    await transporter.verify();
    console.log('✅ Connection verified');

    console.log('\nSending test email...');
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'DealGuard <noreply@dealguard.org>',
      to: process.env.EMAIL_TEST_RECIPIENT || 'mohamedelwatan1@gmail.com',
      subject: '🧪 DealGuard Email Test - ' + new Date().toLocaleString(),
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 600;">DealGuard</h1>
            </div>

            <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <span style="background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">✅ TEST EMAIL</span>
              </div>

              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Email Service Test</h2>

              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                This is a test email to verify that the DealGuard email service is working correctly.
              </p>

              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px;">Test Details:</h3>
                <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Sent at: ${new Date().toLocaleString()}</li>
                  <li>SMTP Host: ${smtpConfig.host}</li>
                  <li>SMTP Port: ${smtpConfig.port}</li>
                  <li>Test Mode: ${process.env.EMAIL_TEST_MODE}</li>
                </ul>
              </div>

              <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <p style="color: #1e40af; margin: 0; font-size: 14px;">
                  <strong>✅ Success!</strong> If you're reading this, the email service is working correctly.
                </p>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  This is an automated test email from DealGuard
                </p>
              </div>
            </div>

            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">DealGuard - Secure Escrow Platform</p>
              <p style="margin: 5px 0 0 0;">This email was sent as part of system testing</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
DealGuard Email Test

This is a test email to verify that the DealGuard email service is working correctly.

Test Details:
- Sent at: ${new Date().toLocaleString()}
- SMTP Host: ${smtpConfig.host}
- SMTP Port: ${smtpConfig.port}
- Test Mode: ${process.env.EMAIL_TEST_MODE}

✅ Success! If you're reading this, the email service is working correctly.

---
DealGuard - Secure Escrow Platform
This email was sent as part of system testing
      `,
    });

    console.log('\n✅ Email sent successfully!');
    console.log('   Message ID:', result.messageId);
    console.log('   Response:', result.response);
    console.log('\n📧 Check your inbox:', process.env.EMAIL_TEST_RECIPIENT);
    console.log('   (Check spam folder if not in inbox)');

  } catch (error: any) {
    console.error('\n❌ Failed to send email:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);

    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed - credentials may be incorrect');
    } else if (error.code === 'EENVELOPE') {
      console.error('\n💡 Invalid email address');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('\n💡 Connection failed - check network and SMTP settings');
    }

    process.exit(1);
  }
}

testEmailSend().catch(console.error);
