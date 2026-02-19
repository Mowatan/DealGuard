import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

// PRODUCTION: Must use REDIS_URL from environment (Railway provides this)
// DEVELOPMENT: Falls back to localhost only in non-production
const isProduction = process.env.NODE_ENV === 'production';
const redisUrl = process.env.REDIS_URL || (isProduction ? '' : 'redis://localhost:6379');

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is required in production');
}

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: false, // Fail fast in production if Redis is down
  connectTimeout: 10000,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis reconnection attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
});

// Handle Redis connection events
connection.on('connect', () => {
  console.log('✅ Redis: Connected successfully');
});

connection.on('ready', () => {
  console.log('✅ Redis: Ready to accept commands');
});

connection.on('error', (error) => {
  console.error('❌ Redis connection error:', error.message);
  // Don't crash the app, just log the error
});

connection.on('close', () => {
  console.warn('⚠️  Redis: Connection closed');
});

connection.on('reconnecting', () => {
  console.log('🔄 Redis: Attempting to reconnect...');
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

// Email sending worker (using Mailgun HTTP API)
export const emailSendingWorker = new Worker(
  'email-sending',
  async (job: Job) => {
    const { to, subject, template, variables, dealId } = job.data;
    console.log(`Sending email: ${template} to ${Array.isArray(to) ? to.join(', ') : to}`);

    try {
      // Use Mailgun HTTP API via emailService (works on Railway and all PaaS)
      const { emailService } = await import('./email.service');

      // Initialize if not already done
      emailService.initializeMailgun();

      // Send email using the new service
      const result = await emailService.sendEmail({
        to,
        subject,
        template,
        variables,
        dealId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      console.log('✅ Email sent successfully:', {
        template,
        messageId: result.messageId,
        recipients: Array.isArray(to) ? to.join(', ') : to,
      });

      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error('❌ Failed to send email:', {
        error: error.message || 'Unknown error',
        template,
        dealId,
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Can handle more concurrent emails with HTTP API
    limiter: {
      max: 20, // Max 20 emails
      duration: 10000, // Per 10 seconds (within Mailgun limits)
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
