import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { authorizeMilestone, authorizeDeal } from '../../middleware/authorize';
import {
  submitMilestoneResponse,
  getMilestoneResponses,
  getDealMilestoneNegotiationStatus,
} from './milestone-negotiation.service';
import { prisma } from '../../lib/prisma';
import { findPartyByInvitationToken } from '../../repositories/party.repository';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const milestoneResponseSchema = z.object({
  partyId: z.string(),
  responseType: z.enum(['ACCEPTED', 'REJECTED', 'AMENDMENT_PROPOSED']),
  amendmentProposal: z.object({
    newAmount: z.number().positive().optional(),
    newDeadline: z.string().optional(),
    newDescription: z.string().optional(),
    reason: z.string().min(1),
  }).optional(),
  notes: z.string().optional(),
});

const batchResponseSchema = z.object({
  responses: z.array(z.object({
    milestoneId: z.string(),
    responseType: z.enum(['ACCEPTED', 'REJECTED', 'AMENDMENT_PROPOSED']),
    amendmentProposal: z.object({
      newAmount: z.number().positive().optional(),
      newDeadline: z.string().optional(),
      newDescription: z.string().optional(),
      reason: z.string().min(1),
    }).optional(),
    notes: z.string().optional(),
  })),
});

// ============================================================================
// ROUTES
// ============================================================================

export async function milestoneNegotiationRoutes(server: FastifyInstance) {

  // Public endpoint - get milestones for invitation
  server.get(
    '/api/invitations/:token/milestones',
    async (request, reply) => {
      const { token } = request.params as { token: string };

      try {
        const party = await findPartyByInvitationToken(token);

        if (!party) {
          return reply.code(404).send({
            error: 'Invitation not found',
            message: 'This invitation link is invalid or has expired.',
          });
        }

        // Get deal with milestones
        const deal = await prisma.deal.findUnique({
          where: { id: party.dealId },
          include: {
            parties: {
              select: {
                id: true,
                name: true,
                role: true,
                invitationStatus: true,
              },
            },
            contracts: {
              where: { isEffective: true },
              include: {
                milestones: {
                  select: {
                    id: true,
                    order: true,
                    title: true,
                    description: true,
                    amount: true,
                    currency: true,
                    deadline: true,
                    status: true,
                    triggerType: true,
                  },
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        });

        if (!deal) {
          return reply.code(404).send({
            error: 'Deal not found',
          });
        }

        const contract = deal.contracts[0];

        return {
          party: {
            id: party.id,
            name: party.name,
            role: party.role,
          },
          deal: {
            id: deal.id,
            dealNumber: deal.dealNumber,
            title: deal.title,
            status: deal.status,
          },
          milestones: contract?.milestones || [],
        };
      } catch (error: unknown) {
        console.error('Error fetching milestones for invitation:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';

        return reply.code(500).send({
          error: 'Failed to fetch milestones',
          message,
        });
      }
    }
  );

  // Authenticated + Authorized - submit response to single milestone
  server.post(
    '/api/milestones/:milestoneId/respond',
    {
      preHandler: [authenticate, authorizeMilestone],
    },
    async (request, reply) => {
      const { milestoneId } = request.params as { milestoneId: string };
      const userId = request.user!.id;

      try {
        const body = milestoneResponseSchema.parse(request.body);

        const response = await submitMilestoneResponse(
          milestoneId,
          body.partyId,
          {
            responseType: body.responseType,
            amendmentProposal: body.amendmentProposal,
            notes: body.notes,
          },
          userId
        );

        return {
          success: true,
          message: 'Response submitted successfully',
          response: {
            id: response.id,
            responseType: response.responseType,
            respondedAt: response.respondedAt,
          },
        };
      } catch (error: unknown) {
        console.error('Error submitting milestone response:', error);

        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation error',
            details: error.errors,
          });
        }

        const message = error instanceof Error ? error.message : 'An unexpected error occurred';

        return reply.code(500).send({
          error: 'Failed to submit response',
          message,
        });
      }
    }
  );

  // Authenticated - batch submit all milestone responses (after signup)
  server.post(
    '/api/invitations/:token/respond-all',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const userId = request.user!.id;

      try {
        const body = batchResponseSchema.parse(request.body);

        // Get party by token
        const party = await findPartyByInvitationToken(token);

        if (!party) {
          return reply.code(404).send({
            error: 'Invitation not found',
          });
        }

        // Verify user is member of this party
        const partyMember = await prisma.partyMember.findFirst({
          where: {
            partyId: party.id,
            userId,
          },
        });

        if (!partyMember) {
          return reply.code(403).send({
            error: 'You are not a member of this party',
          });
        }

        // Submit all responses in transaction
        const responses = await prisma.$transaction(
          body.responses.map(responseData =>
            prisma.milestonePartyResponse.upsert({
              where: {
                milestoneId_partyId: {
                  milestoneId: responseData.milestoneId,
                  partyId: party.id,
                },
              },
              create: {
                milestoneId: responseData.milestoneId,
                partyId: party.id,
                responseType: responseData.responseType,
                amendmentProposal: responseData.amendmentProposal ? (responseData.amendmentProposal as Prisma.InputJsonValue) : Prisma.JsonNull,
                notes: responseData.notes || null,
              },
              update: {
                responseType: responseData.responseType,
                amendmentProposal: responseData.amendmentProposal ? (responseData.amendmentProposal as Prisma.InputJsonValue) : Prisma.JsonNull,
                notes: responseData.notes || null,
                respondedAt: new Date(),
              },
            })
          )
        );

        console.log(`✅ Batch submitted ${responses.length} milestone responses`);

        // Trigger status updates for all milestones (import updateMilestoneStatus function)
        // For now, just return success - status will update on individual responses

        // Get deal status
        const deal = await prisma.deal.findUnique({
          where: { id: party.dealId },
          select: { id: true, dealNumber: true, status: true },
        });

        return {
          success: true,
          message: 'All responses submitted successfully',
          responsesCount: responses.length,
          dealStatus: deal?.status,
        };
      } catch (error: unknown) {
        console.error('Error batch submitting milestone responses:', error);

        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation error',
            details: error.errors,
          });
        }

        const message = error instanceof Error ? error.message : 'An unexpected error occurred';

        return reply.code(500).send({
          error: 'Failed to submit responses',
          message,
        });
      }
    }
  );

  // Authenticated + Authorized - get all milestone responses for a deal
  server.get(
    '/api/deals/:dealId/milestone-responses',
    {
      preHandler: [authenticate, authorizeDeal],
    },
    async (request, reply) => {
      const { dealId } = request.params as { dealId: string };
      const userId = request.user!.id;

      try {
        const data = await getDealMilestoneNegotiationStatus(dealId, userId);

        return data;
      } catch (error: unknown) {
        console.error('Error fetching deal milestone responses:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';

        return reply.code(500).send({
          error: 'Failed to fetch milestone responses',
          message,
        });
      }
    }
  );

  // Authenticated + Authorized - get responses for specific milestone
  server.get(
    '/api/milestones/:milestoneId/responses',
    {
      preHandler: [authenticate, authorizeMilestone],
    },
    async (request, reply) => {
      const { milestoneId } = request.params as { milestoneId: string };
      const userId = request.user!.id;

      try {
        const data = await getMilestoneResponses(milestoneId, userId);

        return data;
      } catch (error: unknown) {
        console.error('Error fetching milestone responses:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';

        return reply.code(500).send({
          error: 'Failed to fetch responses',
          message,
        });
      }
    }
  );
}
