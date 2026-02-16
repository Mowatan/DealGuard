import { FastifyInstance } from 'fastify';

/**
 * CORS test routes for debugging
 */
export async function testCorsRoutes(fastify: FastifyInstance) {
  // GET endpoint to test CORS
  fastify.get('/api/test-cors', async (request, reply) => {
    const origin = request.headers.origin;
    const corsEnv = process.env.CORS_ORIGIN || process.env.FRONTEND_URL;
    const allowedOrigins = corsEnv?.split(',').map(o => o.trim()) || [];

    return {
      success: true,
      message: 'CORS is working! ✅',
      timestamp: new Date().toISOString(),
      debug: {
        requestOrigin: origin || '(no origin header)',
        allowedOrigins,
        corsEnvVar: process.env.CORS_ORIGIN ? 'CORS_ORIGIN' : 'FRONTEND_URL',
        corsEnvValue: corsEnv,
        method: request.method,
        headers: {
          origin: request.headers.origin,
          referer: request.headers.referer,
          'user-agent': request.headers['user-agent'],
        },
        isOriginAllowed: origin ? allowedOrigins.includes(origin) : 'N/A (no origin)',
      },
    };
  });

  // POST endpoint to test CORS with body
  fastify.post('/api/test-cors', async (request, reply) => {
    return {
      success: true,
      message: 'POST request successful! ✅',
      receivedBody: request.body,
      timestamp: new Date().toISOString(),
    };
  });

  // OPTIONS endpoint (handled automatically by @fastify/cors, but adding for visibility)
  fastify.options('/api/test-cors', async (request, reply) => {
    reply.send({
      message: 'OPTIONS preflight successful! ✅',
      timestamp: new Date().toISOString(),
    });
  });
}
