import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as dealService from './deals.service';
import { authenticate } from '../../middleware/auth';
import { requireCaseOfficer } from '../../middleware/authorize';
import { ServiceTier } from '@prisma/client';

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

  // List deals (all authenticated users)
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
    });
    return deals;
  });

  // Get deal by ID (all authenticated users)
  server.get(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const deal = await dealService.getDealById(id);
    
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

  // Get deal audit trail (all authenticated users)
  server.get(
    '/:id/audit',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const audit = await dealService.getDealAuditTrail(id);
    return audit;
  });

  // Get invitation details by token (no auth required)
  server.get(
    '/invitations/:token',
    async (request, reply) => {
      const { token } = request.params as { token: string };

      try {
        const party = await dealService.getPartyByInvitationToken(token);

        if (!party) {
          return reply.code(404).send({ error: 'Invalid invitation token' });
        }

        return {
          party: {
            id: party.id,
            name: party.name,
            role: party.role,
            contactEmail: party.contactEmail,
            invitationStatus: party.invitationStatus,
            invitedAt: party.invitedAt,
            respondedAt: party.respondedAt,
          },
          deal: {
            id: party.deal.id,
            dealNumber: party.deal.dealNumber,
            title: party.deal.title,
            description: party.deal.description,
            totalAmount: party.deal.totalAmount,
            currency: party.deal.currency,
            status: party.deal.status,
          },
          otherParties: party.deal.parties
            .filter(p => p.id !== party.id)
            .map(p => ({
              name: p.name,
              role: p.role,
              invitationStatus: p.invitationStatus,
            })),
        };
      } catch (error) {
        return reply.code(500).send({ error: 'Failed to fetch invitation details' });
      }
    }
  );

  // Confirm party invitation (no auth required)
  server.post(
    '/invitations/:token/confirm',
    async (request, reply) => {
      const { token } = request.params as { token: string };

      try {
        const result = await dealService.confirmPartyInvitation(token);

        if (result.alreadyAccepted) {
          return reply.code(200).send({
            message: 'Invitation already accepted',
            ...result,
          });
        }

        return reply.code(200).send({
          message: 'Invitation confirmed successfully',
          ...result,
        });
      } catch (error) {
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        return reply.code(500).send({ error: 'Failed to confirm invitation' });
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
}
