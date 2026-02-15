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

    const { emailService } = await import('./email.service');
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

    return { success: true, messageId: result.messageId };
  },
  {
    connection,
    concurrency: 5, // Process 5 emails concurrently
    limiter: {
      max: 5, // Max 5 jobs
      duration: 1000, // Per second (rate limiting)
    },
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
