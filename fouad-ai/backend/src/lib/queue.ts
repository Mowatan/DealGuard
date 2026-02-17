import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Queue definitions
export const emailProcessingQueue = new Queue('email-processing', { connection });
export const blockchainAnchorQueue = new Queue('blockchain-anchor', { connection });
export const aiSuggestionQueue = new Queue('ai-suggestion', { connection });
export const emailSendingQueue = new Queue('email-sending', { connection });

// Email processing worker
export const emailWorker = new Worker(
  'email-processing',
  async (job: Job) => {
    const { emailData } = job.data;
    console.log(`Processing email: ${emailData.subject}`);
    
    // Import dynamically to avoid circular dependencies
    const { processInboundEmail } = await import('../modules/evidence/evidence.service');
    await processInboundEmail(emailData);
    
    return { success: true };
  },
  { connection }
);

// Blockchain anchoring worker
export const blockchainWorker = new Worker(
  'blockchain-anchor',
  async (job: Job) => {
    const { dealId, eventType, eventId, dataHash } = job.data;
    console.log(`Anchoring ${eventType} for deal ${dealId}`);
    
    const { anchorToBlockchain } = await import('../modules/blockchain/blockchain.service');
    await anchorToBlockchain(dealId, eventType, eventId, dataHash);
    
    return { success: true };
  },
  { connection }
);

// AI suggestion worker
export const aiWorker = new Worker(
  'ai-suggestion',
  async (job: Job) => {
    const { type, data } = job.data;
    console.log(`Generating AI suggestion: ${type}`);

    const { generateAISuggestion } = await import('../modules/ai/ai.service');
    await generateAISuggestion(type, data);

    return { success: true };
  },
  { connection }
);

// Email sending worker
export const emailSendingWorker = new Worker(
  'email-sending',
  async (job: Job) => {
    const { to, subject, template, variables, dealId } = job.data;
    console.log(`Sending email: ${template} to ${Array.isArray(to) ? to.join(', ') : to}`);

    try {
      // Create fresh nodemailer transporter for each email to avoid connection issues
      const nodemailer = await import('nodemailer');
      const fs = await import('fs/promises');
      const path = await import('path');

      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
      });

      // Load and render template
      const templatePath = path.join(__dirname, '..', '..', 'templates', 'emails', `${template}.html`);
      let html = await fs.readFile(templatePath, 'utf-8');

      // Replace template variables
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(placeholder, String(value || ''));
      });

      // Handle test mode
      const testMode = process.env.EMAIL_TEST_MODE === 'true';
      const finalTo = testMode && process.env.EMAIL_TEST_RECIPIENT
        ? process.env.EMAIL_TEST_RECIPIENT
        : (Array.isArray(to) ? to.join(', ') : to);

      if (testMode) {
        console.log(`Test mode: Redirecting to ${finalTo}`);
      }

      // Send email
      const result = await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'DealGuard <noreply@dealguard.org>',
        to: finalTo,
        subject,
        html,
      });

      console.log('✅ Email sent successfully:', {
        template,
        messageId: result.messageId,
        recipients: finalTo,
      });

      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error('Failed to send email:', {
        error: error.message || 'Unknown error',
        code: error.code,
        template,
        dealId,
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // One email at a time to avoid any connection issues
    limiter: {
      max: 5, // Max 5 jobs
      duration: 30000, // Per 30 seconds
    },
    lockDuration: 60000, // 60 second timeout for email jobs
    maxStalledCount: 2, // Retry up to 2 times if stalled
  }
);

// Configure retry settings for email sending
emailSendingQueue.on('error', (error) => {
  console.error('Email sending queue error:', error);
});

// Graceful shutdown
export async function shutdownQueues() {
  await emailWorker.close();
  await blockchainWorker.close();
  await aiWorker.close();
  await emailSendingWorker.close();
  await connection.quit();
}

console.log('✅ Queue workers started');
