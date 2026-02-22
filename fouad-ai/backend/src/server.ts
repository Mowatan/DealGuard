import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from 'dotenv';
import { promises as fs } from 'fs';
import * as path from 'path';
import { prisma } from './lib/prisma';
import { storage } from './lib/storage';
import { validateEnvironment, printEnvironmentStatus } from './lib/env-validator';
import { dealsRoutes } from './modules/deals/deals.routes';
import { contractsRoutes } from './modules/contracts/contracts.routes';
import { evidenceRoutes } from './modules/evidence/evidence.routes';
import { custodyRoutes } from './modules/custody/custody.routes';
// import { blockchainRoutes } from './modules/blockchain/blockchain.routes'; // DISABLED - Not needed for MVP
import { webhookRoutes } from './modules/webhooks/webhook.routes';
import { usersRoutes } from './modules/users/users.routes';
import milestonesRoutes from './modules/milestones/milestones.routes';
import { milestoneNegotiationRoutes } from './modules/milestone-negotiation/milestone-negotiation.routes';
import kycRoutes from './modules/kyc/kyc.routes';
import disputesRoutes from './modules/disputes/disputes.routes';
import { custodyDocumentsRoutes } from './modules/custody-documents/custody-documents.routes';
import { progressRoutes } from './modules/progress/progress.routes';
import { testCorsRoutes } from './modules/test/test-cors.routes';
import { invitationsRoutes } from './modules/invitations/invitations.routes';

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
    // Validate environment variables before starting
    const validation = validateEnvironment();
    if (!validation.valid) {
      console.error('❌ Cannot start server: Environment validation failed');
      process.exit(1);
    }

    printEnvironmentStatus();

    // Register plugins with multiple CORS origins support
    // PRODUCTION: Use CORS_ORIGIN or FRONTEND_URL from environment
    // DEVELOPMENT: Falls back to localhost
    const isProduction = process.env.NODE_ENV === 'production';
    const corsEnv = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || (isProduction ? '' : 'http://localhost:3000');

    if (!corsEnv && isProduction) {
      server.log.error('❌ CRITICAL: CORS_ORIGIN or FRONTEND_URL not configured in production!');
      throw new Error('CORS_ORIGIN or FRONTEND_URL must be configured in production');
    }

    const allowedOrigins = corsEnv
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);

    // Log CORS configuration on startup
    server.log.info({
      allowedOrigins,
      env: process.env.NODE_ENV,
      corsEnvVar: process.env.CORS_ORIGIN ? 'CORS_ORIGIN' : 'FRONTEND_URL',
    }, '🔐 CORS Configuration');

    await server.register(cors, {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) {
          callback(null, true);
          return;
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          server.log.info(`✅ CORS: Allowed request from origin: ${origin}`);
          callback(null, true);
        } else {
          server.log.warn({
            origin,
            allowedOrigins,
          }, `❌ CORS: Blocked request from origin: ${origin}`);
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Length', 'X-Request-Id'],
      maxAge: 86400, // 24 hours - cache preflight requests
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

    // Health check with timeout to prevent hanging
    server.get('/health', async () => {
      try {
        // Run checks concurrently with a 3-second timeout
        const [dbStatus, storageStatus] = await Promise.race([
          Promise.all([
            checkDatabase(),
            storage.healthCheck()
          ]),
          // Timeout after 3 seconds
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 3000)
          )
        ]);

        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
          database: dbStatus,
          storage: {
            current: storageStatus.current,
            providers: {
              primary: storageStatus.primary ? 'healthy' : 'unhealthy',
              fallback: storageStatus.fallback === null ? 'disabled' :
                       (storageStatus.fallback ? 'healthy' : 'unhealthy')
            }
          }
        };
      } catch (error) {
        // Return degraded status if checks timeout or fail
        return {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          database: 'unknown',
          storage: 'unknown'
        };
      }
    });

    // Static file serving for local storage fallback
    server.get('/files/:bucket/:key', async (request, reply) => {
      const { bucket, key } = request.params as { bucket: string; key: string };

      // Security: Validate bucket against whitelist (prevent path traversal)
      const validBuckets = ['fouad-documents', 'fouad-evidence'];
      if (!validBuckets.includes(bucket)) {
        return reply.code(403).send({ error: 'Invalid bucket' });
      }

      // Get local storage path from environment
      const localStoragePath = process.env.STORAGE_LOCAL_PATH || '/app/uploads';
      const filePath = path.join(localStoragePath, bucket, key);

      try {
        // Check file exists and is readable
        await fs.access(filePath, fs.constants.R_OK);

        // Read file and send
        const fileBuffer = await fs.readFile(filePath);

        // Set content type based on file extension
        const ext = path.extname(key).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.pdf': 'application/pdf',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.txt': 'text/plain',
          '.json': 'application/json',
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        reply.header('Content-Type', contentType);

        return reply.send(fileBuffer);
      } catch (error) {
        // File not found or not readable
        return reply.code(404).send({ error: 'File not found' });
      }
    });

    // Register routes
    await server.register(testCorsRoutes); // CORS test endpoint
    await server.register(invitationsRoutes); // Public invitation acceptance
    await server.register(usersRoutes, { prefix: '/api/users' });
    await server.register(dealsRoutes, { prefix: '/api/deals' });
    await server.register(contractsRoutes, { prefix: '/api/contracts' });
    await server.register(evidenceRoutes, { prefix: '/api/evidence' });
    await server.register(custodyRoutes, { prefix: '/api/custody' });
    await server.register(custodyDocumentsRoutes, { prefix: '/api' });
    // await server.register(blockchainRoutes, { prefix: '/api/blockchain' }); // DISABLED
    await server.register(webhookRoutes, { prefix: '/webhooks' });
    await server.register(milestonesRoutes);
    await server.register(milestoneNegotiationRoutes); // Milestone negotiation system
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
