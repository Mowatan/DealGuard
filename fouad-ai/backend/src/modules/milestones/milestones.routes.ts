import { FastifyInstance } from 'fastify';
import * as milestonesService from './milestones.service';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

export default async function milestonesRoutes(fastify: FastifyInstance) {
  // Get milestone details
  fastify.get(
    '/api/milestones/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const milestone = await milestonesService.getMilestoneDetails(id, request.user!.id);
        return reply.send(milestone);
      } catch (error: any) {
        if (error.message.includes('Unauthorized')) {
          return reply.code(403).send({ error: error.message });
        }
        return reply.code(404).send({ error: error.message });
      }
    }
  );

  // List milestones for a contract
  fastify.get(
    '/api/milestones/contract/:contractId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { contractId } = request.params as { contractId: string };

      try {
        const milestones = await milestonesService.listMilestonesByContract(contractId, request.user!.id);
        return reply.send(milestones);
      } catch (error: any) {
        if (error.message.includes('Unauthorized')) {
          return reply.code(403).send({ error: error.message });
        }
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Submit approval for milestone
  fastify.post(
    '/api/milestones/:id/approvals',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { partyId, notes } = request.body as {
        partyId?: string;
        notes?: string;
      };

      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'User not authenticated' });
      }

      try {
        const approval = await milestonesService.submitApproval(
          id,
          userId,
          partyId || null,
          notes
        );
        return reply.send(approval);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // List approvals for a milestone
  fastify.get(
    '/api/milestones/:id/approvals',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const approvals = await milestonesService.listApprovals(id, request.user!.id);
        return reply.send(approvals);
      } catch (error: any) {
        if (error.message.includes('Unauthorized')) {
          return reply.code(403).send({ error: error.message });
        }
        return reply.code(500).send({ error: error.message });
      }
    }
  );

  // Set approval requirements (admin only)
  fastify.post(
    '/api/milestones/:id/requirements',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const {
        requireAdminApproval,
        requireBuyerApproval,
        requireSellerApproval,
      } = request.body as {
        requireAdminApproval?: boolean;
        requireBuyerApproval?: boolean;
        requireSellerApproval?: boolean;
      };

      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'User not authenticated' });
      }

      try {
        const requirement = await milestonesService.setApprovalRequirements(
          id,
          {
            requireAdminApproval,
            requireBuyerApproval,
            requireSellerApproval,
          },
          userId
        );
        return reply.send(requirement);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Evaluate milestone readiness (internal/system endpoint)
  fastify.post(
    '/api/milestones/:id/evaluate-readiness',
    { preHandler: [authenticate, authorize(['CASE_OFFICER'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const milestone = await milestonesService.evaluateMilestoneReadiness(id);
        return reply.send(milestone);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );
}
