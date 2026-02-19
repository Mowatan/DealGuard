/**
 * SMTP Connection Test
 * Tests the SMTP configuration and credentials
 */

import nodemailer from 'nodemailer';
import { config } from 'dotenv';

config();

async function testSMTP() {
  console.log('\n=== Testing SMTP Connection ===\n');

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
    debug: true, // Enable debug output
    logger: true, // Enable logging
  };

  console.log('Configuration:');
  console.log('  Host:', smtpConfig.host);
  console.log('  Port:', smtpConfig.port);
  console.log('  Secure:', smtpConfig.secure);
  console.log('  User:', smtpConfig.auth.user);
  console.log('  Pass:', smtpConfig.auth.pass ? '***' + smtpConfig.auth.pass.slice(-4) : 'NOT SET');

  try {
    console.log('\nCreating transporter...');
    const transporter = nodemailer.createTransport(smtpConfig);

    console.log('\nVerifying connection...');
    const verified = await transporter.verify();

    if (verified) {
      console.log('✅ SMTP connection verified successfully!');
      console.log('\nConnection is ready to send emails.');
    }
  } catch (error: any) {
    console.error('\n❌ SMTP verification failed:');
    console.error('  Error:', error.message);
    console.error('  Code:', error.code);
    console.error('  Command:', error.command);

    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed. Please check:');
      console.error('  - SMTP username is correct');
      console.error('  - SMTP password is correct');
      console.error('  - Account is active and verified in Mailgun');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('\n💡 Connection failed. Please check:');
      console.error('  - SMTP host and port are correct');
      console.error('  - Firewall is not blocking port', smtpConfig.port);
      console.error('  - Internet connection is working');
    } else if (error.code === 'ECONNRESET') {
      console.error('\n💡 Connection was reset. This could mean:');
      console.error('  - Wrong authentication credentials');
      console.error('  - Account not verified in Mailgun');
      console.error('  - Domain not verified in Mailgun');
      console.error('  - IP address blocked by Mailgun');
    }

    process.exit(1);
  }
}

testSMTP().catch(console.error);
