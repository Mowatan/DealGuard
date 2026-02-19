import { FastifyPluginAsync } from 'fastify';
import * as progressService from './progress.service';
import { authenticate } from '../../middleware/auth';

export const progressRoutes: FastifyPluginAsync = async (fastify) => {
  // REMOVED: Duplicate route - GET /deals/:dealId/progress is already handled in deals.routes.ts
  // The deals.routes.ts implementation calculates real-time progress from milestones and parties
  // This was causing: "Method 'GET' already declared for route '/api/deals/:dealId/progress'"

  // Initialize progress tracker (auto-called on deal creation, but can be manual)
  fastify.post('/deals/:dealId/progress/initialize', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { dealId } = request.params as { dealId: string };
      const user = (request as any).user;

      const events = await progressService.initializeProgressTracker(dealId, user.id);
      return { events };
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Advance to next stage
  fastify.post('/deals/:dealId/progress/advance', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { dealId } = request.params as { dealId: string };
      const { stageKey, notes } = request.body as { stageKey: string; notes?: string };
      const user = (request as any).user;

      const result = await progressService.advanceStage(
        dealId,
        stageKey,
        user.id,
        notes
      );

      return result;
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Update stage status
  fastify.patch('/deals/:dealId/progress/:stageKey', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { dealId, stageKey } = request.params as { dealId: string; stageKey: string };
      const { status, notes } = request.body as { status: any; notes?: string };
      const user = (request as any).user;

      const stage = await progressService.updateStageStatus(
        dealId,
        stageKey,
        status,
        notes,
        user.id
      );

      return stage;
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get all deals in a specific stage
  fastify.get('/progress/stages/:stageKey/deals', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const { stageKey } = request.params as { stageKey: string };
      const deals = await progressService.getDealsInStage(stageKey);
      return { deals };
    } catch (error: any) {
      reply.status(500).send({ error: error.message });
    }
  });
};
