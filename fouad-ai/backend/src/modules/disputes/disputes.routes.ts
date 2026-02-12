import { FastifyInstance } from 'fastify';
import * as disputesService from './disputes.service';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

export default async function disputesRoutes(fastify: FastifyInstance) {
  // Create dispute
  fastify.post(
    '/api/disputes',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { dealId, milestoneId, issueType, narrative } = request.body as {
        dealId: string;
        milestoneId?: string;
        issueType: string;
        narrative: string;
      };

      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'User not authenticated' });
      }

      if (!dealId || !issueType || !narrative) {
        return reply.code(400).send({
          error: 'dealId, issueType, and narrative are required',
        });
      }

      try {
        const dispute = await disputesService.createDispute({
          dealId,
          milestoneId,
          issueType,
          narrative,
          raisedBy: userId,
        });
        return reply.code(201).send(dispute);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Get dispute details
  fastify.get(
    '/api/disputes/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const dispute = await disputesService.getDisputeById(id);
        return reply.send(dispute);
      } catch (error: any) {
        return reply.code(404).send({ error: error.message });
      }
    }
  );

  // List disputes for a deal
  fastify.get(
    '/api/disputes/deal/:dealId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { dealId } = request.params as { dealId: string };

      try {
        const disputes = await disputesService.listDisputesByDeal(dealId);
        return reply.send(disputes);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Add mediation note (admin only)
  fastify.post(
    '/api/disputes/:id/mediation',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { note } = request.body as { note: string };
      const userId = request.user?.id;

      if (!note) {
        return reply.code(400).send({ error: 'Note is required' });
      }

      if (!userId) {
        return reply.code(401).send({ error: 'User not authenticated' });
      }

      try {
        const dispute = await disputesService.addMediationNote(id, note, userId);
        return reply.send(dispute);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Resolve dispute (admin only)
  fastify.post(
    '/api/disputes/:id/resolve',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { resolutionNotes } = request.body as { resolutionNotes: string };
      const userId = request.user?.id;

      if (!resolutionNotes) {
        return reply.code(400).send({ error: 'Resolution notes are required' });
      }

      if (!userId) {
        return reply.code(401).send({ error: 'User not authenticated' });
      }

      try {
        const dispute = await disputesService.resolveDispute(
          id,
          resolutionNotes,
          userId
        );
        return reply.send(dispute);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // List all open disputes (case officer and above)
  fastify.get(
    '/api/disputes/open',
    { preHandler: [authenticate, authorize(['CASE_OFFICER'])] },
    async (request, reply) => {
      try {
        const disputes = await disputesService.listOpenDisputes();
        return reply.send(disputes);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );
}
