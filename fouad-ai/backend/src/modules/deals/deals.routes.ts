import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as dealService from './deals.service';
import { authenticate } from '../../middleware/auth';
import { requireCaseOfficer } from '../../middleware/authorize';
import { ServiceTier } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const createDealSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),

  // Service tier and fees
  serviceTier: z.enum(['GOVERNANCE_ADVISORY', 'DOCUMENT_CUSTODY', 'FINANCIAL_ESCROW']),
  estimatedValue: z.number().positive().optional(),

  // Transaction details
  transactionType: z.enum(['SIMPLE', 'MILESTONE_BASED']).optional(),
  currency: z.string().optional(),
  totalAmount: z.number().positive().optional(),

  // Parties
  parties: z.array(z.object({
    role: z.string(), // Allow any string for custom roles
    name: z.string(),
    isOrganization: z.boolean().default(false),
    organizationId: z.string().optional(),
    contactEmail: z.string().email(),
    contactPhone: z.string().optional(),
  })).min(2),

  // Milestones (for MILESTONE_BASED transactions)
  milestones: z.array(z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    amount: z.string(),
    deadline: z.string().optional(),
  })).optional(),

  // Creator info
  creatorName: z.string().optional(),
  creatorEmail: z.string().email().optional(),
});

const updateDealSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  totalAmount: z.number().optional(),
  currency: z.string().optional(),
});

const proposeDealAmendmentSchema = z.object({
  proposedChanges: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    totalAmount: z.number().optional(),
    currency: z.string().optional(),
  }),
});

const proposeDealDeletionSchema = z.object({
  reason: z.string().min(1),
});

const respondToAmendmentSchema = z.object({
  partyId: z.string(),
  responseType: z.enum(['APPROVE', 'DISPUTE']),
  notes: z.string().optional(),
});

const respondToDeletionSchema = z.object({
  partyId: z.string(),
  responseType: z.enum(['APPROVE', 'DISPUTE']),
  notes: z.string().optional(),
});

export async function dealsRoutes(server: FastifyInstance) {
  // Create new deal (all authenticated users)
  server.post(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const body = createDealSchema.parse(request.body);

        // Additional validation: Tiers 2 & 3 require estimatedValue
        if (
          (body.serviceTier === 'DOCUMENT_CUSTODY' || body.serviceTier === 'FINANCIAL_ESCROW') &&
          !body.estimatedValue
        ) {
          return reply.code(400).send({
            error: 'Validation error',
            details: [`Estimated value is required for ${body.serviceTier} tier`],
          });
        }

        const deal = await dealService.createDeal({
          ...body,
          serviceTier: body.serviceTier as ServiceTier,
          userId: request.user!.id,
        });
        return reply.code(201).send(deal);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      throw error;
    }
  });

  // List deals (all authenticated users - filtered by user membership)
  server.get(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { status, page = '1', limit = '20' } = request.query as any;
    const deals = await dealService.listDeals({
      status: status && status !== 'undefined' ? status : undefined,
      page: parseInt(page),
      limit: parseInt(limit),
      userId: request.user!.id, // Filter by current user
    });
    return deals;
  });

  // Get deal by ID (all authenticated users - with authorization check)
  server.get(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const deal = await dealService.getDealById(id, request.user!.id);

    if (!deal) {
      return reply.code(404).send({ error: 'Deal not found' });
    }

    return deal;
  });

  // Update deal status (case officer and above)
  server.patch(
    '/:id/status',
    {
      preHandler: [authenticate, requireCaseOfficer],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, actorId } = request.body as any;
    
    const deal = await dealService.updateDealStatus(id, status, actorId);
    return deal;
  });

  // Get deal audit trail (all authenticated users - with authorization check)
  server.get(
    '/:id/audit',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const audit = await dealService.getDealAuditTrail(id, request.user!.id);
      return audit;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return reply.code(403).send({ error: error.message });
      }
      throw error;
    }
  });

  // Get deal progress (all authenticated users - with authorization check)
  server.get(
    '/:id/progress',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.id;

      // Verify user has access to this deal
      const deal = await prisma.deal.findFirst({
        where: {
          id,
          OR: [
            { creatorId: userId },
            { parties: { some: { members: { some: { userId } } } } },
          ],
        },
        include: {
          parties: {
            include: {
              members: {
                where: { userId },
                include: {
                  user: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
            },
          },
          contracts: {
            include: {
              milestones: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });

      if (!deal) {
        return reply.code(404).send({ error: 'Deal not found' });
      }

      // Get the effective contract (or latest if none effective)
      const contract = deal.contracts.find((c) => c.isEffective) || deal.contracts[deal.contracts.length - 1];
      const milestones = contract?.milestones || [];

      // Calculate progress
      const totalMilestones = milestones.length;
      const completedMilestones = milestones.filter((m) => m.status === 'APPROVED').length;
      const progressPercentage =
        totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

      // Count party statuses
      const totalParties = deal.parties.length;
      const acceptedParties = deal.parties.filter((p) => p.invitationStatus === 'ACCEPTED').length;
      const pendingParties = deal.parties.filter((p) => p.invitationStatus === 'PENDING').length;

      // Determine current stage
      let currentStage = 'CREATED';
      let stageDescription = 'Deal created, waiting for parties to accept';

      if (acceptedParties === totalParties && totalParties > 0) {
        currentStage = 'ACTIVE';
        stageDescription = 'All parties accepted, deal is active';

        if (completedMilestones === totalMilestones && totalMilestones > 0) {
          currentStage = 'COMPLETED';
          stageDescription = 'All milestones completed';
        } else if (completedMilestones > 0) {
          currentStage = 'IN_PROGRESS';
          stageDescription = `${completedMilestones} of ${totalMilestones} milestones completed`;
        }
      }

      // What's blocking progress?
      const blockers = [];
      if (pendingParties > 0) {
        blockers.push(
          `${pendingParties} ${pendingParties === 1 ? 'party has' : 'parties have'} not accepted yet`
        );
      }

      const pendingMilestones = milestones.filter((m) => m.status === 'PENDING').length;
      if (pendingMilestones > 0 && acceptedParties === totalParties) {
        blockers.push(
          `${pendingMilestones} milestone${pendingMilestones === 1 ? '' : 's'} pending approval`
        );
      }

      return reply.send({
        stage: currentStage,
        stageDescription,
        progressPercentage,
        blockers: blockers.length > 0 ? blockers : null,
        stats: {
          totalParties,
          acceptedParties,
          pendingParties,
          totalMilestones,
          completedMilestones,
          pendingMilestones,
        },
        parties: deal.parties.map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          status: p.invitationStatus,
          members: p.members.map((m) => ({
            user: m.user
              ? {
                  name: m.user.name,
                  email: m.user.email,
                }
              : null,
          })),
        })),
        milestones: milestones.map((m) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          order: m.order,
        })),
      });
    }
  );

  // Accept party invitation (authenticated)
  server.post(
    '/:dealId/parties/:partyId/accept',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { dealId, partyId } = request.params as { dealId: string; partyId: string };

      try {
        const result = await dealService.acceptPartyInvitation({
          dealId,
          partyId,
          userId: request.user!.id,
        });

        return result;
      } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          return reply.code(403).send({ error: error.message });
        }
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  // Cancel deal (creator only, before acceptance)
  server.post(
    '/:id/cancel',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason: string };

      if (!reason) {
        return reply.code(400).send({ error: 'Cancellation reason is required' });
      }

      try {
        const result = await dealService.cancelDeal({
          dealId: id,
          userId: request.user!.id,
          reason,
        });
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Unauthorized')) {
            return reply.code(403).send({ error: error.message });
          }
          if (error.message.includes('cannot be cancelled')) {
            return reply.code(400).send({ error: error.message });
          }
          return reply.code(400).send({ error: error.message });
        }
        throw error;
      }
    }
  );

  // ============================================================================
  // DEAL AMENDMENT & DELETION ROUTES
  // ============================================================================

  // Update deal (Phase 1: Unilateral if no agreements)
  server.patch(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const body = updateDealSchema.parse(request.body);
        const deal = await dealService.updateDeal(id, body, request.user!.id);
        return reply.code(200).send(deal);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Failed to update deal' });
      }
    }
  );

  // Delete deal (Phase 1: Unilateral if no agreements)
  server.delete(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };

      try {
        const result = await dealService.deleteDeal(id, request.user!.id, reason);
        return reply.code(200).send(result);
      } catch (error) {
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Failed to delete deal' });
      }
    }
  );

  // Get deal amendments
  server.get(
    '/:id/amendments',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const amendments = await dealService.getDealAmendments(id, request.user!.id);
        return reply.code(200).send(amendments);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Unauthorized')) {
            return reply.code(403).send({ error: error.message });
          }
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Failed to fetch amendments' });
      }
    }
  );

  // Propose deal amendment (Phase 2: When parties have agreed)
  server.post(
    '/:id/amendments',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const body = proposeDealAmendmentSchema.parse(request.body);
        const amendment = await dealService.proposeDealAmendment(
          id,
          body.proposedChanges,
          request.user!.id,
          request.user!.name
        );
        return reply.code(201).send(amendment);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Failed to propose amendment' });
      }
    }
  );

  // Propose deal deletion (Phase 2: When parties have agreed)
  server.post(
    '/:id/deletion-request',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const body = proposeDealDeletionSchema.parse(request.body);
        const deletionRequest = await dealService.proposeDealDeletion(
          id,
          body.reason,
          request.user!.id,
          request.user!.name
        );
        return reply.code(201).send(deletionRequest);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Failed to propose deletion' });
      }
    }
  );

  // Respond to amendment proposal (approve)
  server.post(
    '/amendments/:id/approve',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const bodyData = request.body as any;
        const body = respondToAmendmentSchema.parse({
          partyId: bodyData.partyId,
          responseType: 'APPROVE',
          notes: bodyData.notes,
        });
        const response = await dealService.respondToAmendment(
          id,
          body.partyId,
          'APPROVE',
          body.notes
        );
        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Failed to approve amendment' });
      }
    }
  );

  // Respond to amendment proposal (dispute)
  server.post(
    '/amendments/:id/dispute',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const bodyData = request.body as any;
        const body = respondToAmendmentSchema.parse({
          partyId: bodyData.partyId,
          responseType: 'DISPUTE',
          notes: bodyData.notes,
        });
        const response = await dealService.respondToAmendment(
          id,
          body.partyId,
          'DISPUTE',
          body.notes
        );
        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Failed to dispute amendment' });
      }
    }
  );

  // Respond to deletion request (approve)
  server.post(
    '/deletion-requests/:id/approve',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const bodyData = request.body as any;
        const body = respondToDeletionSchema.parse({
          partyId: bodyData.partyId,
          responseType: 'APPROVE',
          notes: bodyData.notes,
        });
        const response = await dealService.respondToDeletion(
          id,
          body.partyId,
          'APPROVE',
          body.notes
        );
        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Failed to approve deletion' });
      }
    }
  );

  // Respond to deletion request (dispute)
  server.post(
    '/deletion-requests/:id/dispute',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const bodyData = request.body as any;
        const body = respondToDeletionSchema.parse({
          partyId: bodyData.partyId,
          responseType: 'DISPUTE',
          notes: bodyData.notes,
        });
        const response = await dealService.respondToDeletion(
          id,
          body.partyId,
          'DISPUTE',
          body.notes
        );
        return reply.code(200).send(response);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Failed to dispute deletion' });
      }
    }
  );

  // ===== ADMIN ROUTES =====

  // Get all disputed amendments (admin only)
  server.get(
    '/admin/amendments/disputed',
    {
      preHandler: [authenticate, requireCaseOfficer],
    },
    async (request, reply) => {
      try {
        const amendments = await dealService.getDisputedAmendments();
        return reply.code(200).send(amendments);
      } catch (error) {
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Failed to fetch disputed amendments' });
      }
    }
  );

  // Resolve amendment dispute (admin only)
  server.post(
    '/admin/amendments/:id/resolve',
    {
      preHandler: [authenticate, requireCaseOfficer],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const bodyData = request.body as any;
        const resolutionSchema = z.object({
          resolutionType: z.enum(['APPROVE', 'REJECT', 'REQUEST_COMPROMISE']),
          notes: z.string().min(1),
        });

        const body = resolutionSchema.parse(bodyData);
        const result = await dealService.resolveAmendmentDispute(
          id,
          body.resolutionType,
          body.notes,
          request.user!.id,
          request.user!.name
        );
        return reply.code(200).send(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Failed to resolve amendment' });
      }
    }
  );
}
