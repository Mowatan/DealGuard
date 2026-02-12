import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Queue definitions
export const emailProcessingQueue = new Queue('email-processing', { connection });
export const blockchainAnchorQueue = new Queue('blockchain-anchor', { connection });
export const aiSuggestionQueue = new Queue('ai-suggestion', { connection });

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

// Graceful shutdown
export async function shutdownQueues() {
  await emailWorker.close();
  await blockchainWorker.close();
  await aiWorker.close();
  await connection.quit();
}

console.log('✅ Queue workers started');
