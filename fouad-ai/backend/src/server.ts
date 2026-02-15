import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from 'dotenv';
import { prisma } from './lib/prisma';
import { dealsRoutes } from './modules/deals/deals.routes';
import { contractsRoutes } from './modules/contracts/contracts.routes';
import { evidenceRoutes } from './modules/evidence/evidence.routes';
import { custodyRoutes } from './modules/custody/custody.routes';
import { blockchainRoutes } from './modules/blockchain/blockchain.routes';
import { webhookRoutes } from './modules/webhooks/webhook.routes';
import { usersRoutes } from './modules/users/users.routes';
import milestonesRoutes from './modules/milestones/milestones.routes';
import kycRoutes from './modules/kyc/kyc.routes';
import disputesRoutes from './modules/disputes/disputes.routes';
import { custodyDocumentsRoutes } from './modules/custody-documents/custody-documents.routes';
import { progressRoutes } from './modules/progress/progress.routes';

config();

const server = Fastify({
  logger: process.env.NODE_ENV === 'development'
    ? {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        level: process.env.LOG_LEVEL || 'info',
      },
});

async function start() {
  try {
    // Register plugins
    await server.register(cors, {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    });

    await server.register(multipart, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
      },
    });

    // Root route
    server.get('/', async () => {
      return {
        name: 'DealGuard API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          api: '/api/*',
          webhooks: '/webhooks/*',
        },
      };
    });

    // Health check
    server.get('/health', async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: await checkDatabase(),
      };
    });

    // Register routes
    await server.register(usersRoutes, { prefix: '/api/users' });
    await server.register(dealsRoutes, { prefix: '/api/deals' });
    await server.register(contractsRoutes, { prefix: '/api/contracts' });
    await server.register(evidenceRoutes, { prefix: '/api/evidence' });
    await server.register(custodyRoutes, { prefix: '/api/custody' });
    await server.register(custodyDocumentsRoutes, { prefix: '/api' });
    await server.register(blockchainRoutes, { prefix: '/api/blockchain' });
    await server.register(webhookRoutes, { prefix: '/webhooks' });
    await server.register(milestonesRoutes);
    await server.register(kycRoutes);
    await server.register(disputesRoutes);
    await server.register(progressRoutes, { prefix: '/api' });

    const port = parseInt(process.env.PORT || '4000', 10);
    await server.listen({ port, host: '0.0.0.0' });
    
    console.log(`🚀 Server ready at http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch {
    return 'disconnected';
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
