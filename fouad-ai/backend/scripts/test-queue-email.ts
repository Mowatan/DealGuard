/**
 * Test Email Sending from Queue Context
 * This simulates what happens in the queue worker
 */

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from 'dotenv';

config();

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const testQueue = new Queue('test-email-queue', { connection });

// Create a test worker that sends email
const testWorker = new Worker(
  'test-email-queue',
  async (job: Job) => {
    console.log('\n=== Worker Context Email Test ===\n');
    console.log('Job data:', job.data);

    // Check environment variables in worker context
    console.log('\nEnvironment in worker:');
    console.log('  SMTP_HOST:', process.env.SMTP_HOST);
    console.log('  SMTP_PORT:', process.env.SMTP_PORT);
    console.log('  SMTP_USER:', process.env.SMTP_USER);
    console.log('  SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.slice(-4) : 'NOT SET');

    // Try to send email using nodemailer directly
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      debug: true,
      logger: true,
    });

    console.log('\nVerifying connection...');
    await transporter.verify();
    console.log('✅ Connection verified in worker!');

    console.log('\nSending email...');
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TEST_RECIPIENT,
      subject: 'Test from Queue Worker - ' + new Date().toISOString(),
      text: 'This email was sent from a BullMQ queue worker to test if credentials work in worker context.',
    });

    console.log('✅ Email sent from worker!');
    console.log('   Message ID:', result.messageId);

    return { success: true, messageId: result.messageId };
  },
  {
    connection,
    settings: {
      lockDuration: 60000,
    },
  }
);

testWorker.on('completed', (job) => {
  console.log(`\n✅ Job ${job.id} completed successfully`);
  process.exit(0);
});

testWorker.on('failed', (job, error) => {
  console.error(`\n❌ Job ${job?.id} failed:`, error.message);
  console.error('Error code:', error.code);
  process.exit(1);
});

async function runTest() {
  console.log('Adding job to queue...');

  await testQueue.add('test-email', {
    message: 'Test email from queue worker',
  });

  console.log('Job added, waiting for worker to process...\n');
}

runTest().catch((error) => {
  console.error('Failed to add job:', error);
  process.exit(1);
});

// Keep process alive
setTimeout(() => {
  console.error('\n⏱️  Test timed out after 60 seconds');
  process.exit(1);
}, 60000);
