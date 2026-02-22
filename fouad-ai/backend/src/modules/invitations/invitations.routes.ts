import { FastifyInstance } from 'fastify';
import * as dealsService from '../deals/deals.service';
import { authenticate } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { InvitationStatus, DealStatus } from '@prisma/client';
import { createAuditLog } from '../../lib/audit';

/**
 * Invitation acceptance routes
 *
 * These routes handle the public invitation flow:
 * 1. User receives email with invitation token
 * 2. Clicks link to /invitations/:token
 * 3. Views deal details (no auth required)
 * 4. Accepts or declines invitation
 */
export async function invitationsRoutes(server: FastifyInstance) {
  // Get invitation details by token (public endpoint - no auth required)
  server.get(
    '/api/invitations/:token',
    async (request, reply) => {
      const { token } = request.params as { token: string };

      try {
        const party = await dealsService.getPartyByInvitationToken(token);

        if (!party) {
          return reply.code(404).send({
            error: 'Invitation not found',
            message: 'This invitation link is invalid or has expired.'
          });
        }

        // Return deal and party information
        return {
          party: {
            id: party.id,
            name: party.name,
            role: party.role,
            contactEmail: party.contactEmail,
            invitationStatus: party.invitationStatus,
            respondedAt: party.respondedAt,
          },
          deal: {
            id: party.deal.id,
            dealNumber: party.deal.dealNumber,
            title: party.deal.title,
            status: party.deal.status,
            serviceTier: party.deal.serviceTier,
            currency: party.deal.currency,
            dealValue: party.deal.totalAmount ? party.deal.totalAmount.toString() : '0',
            parties: party.deal.parties.map((p) => ({
              id: p.id,
              name: p.name,
              role: p.role,
              invitationStatus: p.invitationStatus,
            })),
          },
        };
      } catch (error: any) {
        console.error('Error fetching invitation:', error);
        return reply.code(500).send({
          error: 'Failed to fetch invitation details',
          message: error.message
        });
      }
    }
  );

  // Accept invitation (requires authentication)
  server.post(
    '/api/invitations/:token/accept',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const userId = request.user!.id;

      try {
        // Find the party by invitation token
        const party = await prisma.party.findFirst({
          where: { invitationToken: token },
          include: {
            deal: true,
            members: true,
          },
        });

        if (!party) {
          return reply.code(404).send({
            error: 'Invalid invitation',
            message: 'This invitation link is invalid or has expired.',
          });
        }

        // Check if invitation was declined
        if (party.invitationStatus === InvitationStatus.DECLINED) {
          return reply.code(400).send({
            error: 'Invitation declined',
            message: 'This invitation has been declined and cannot be accepted.',
          });
        }

        // Check if already accepted
        if (party.invitationStatus === InvitationStatus.ACCEPTED) {
          return {
            success: true,
            alreadyAccepted: true,
            message: 'This invitation has already been accepted.',
            dealId: party.dealId,
            dealNumber: party.deal.dealNumber,
          };
        }

        // Check if user is already a member of this party
        const existingMember = party.members.find((m) => m.userId === userId);

        if (!existingMember) {
          // Add user as a party member
          await prisma.partyMember.create({
            data: {
              partyId: party.id,
              userId: userId,
            },
          });
        }

        // Update party invitation status to ACCEPTED
        await prisma.party.update({
          where: { id: party.id },
          data: {
            invitationStatus: InvitationStatus.ACCEPTED,
            respondedAt: new Date(),
          },
        });

        // Create audit log
        const { createAuditLog } = await import('../../lib/audit');
        await createAuditLog({
          dealId: party.dealId,
          eventType: 'PARTY_ACCEPTED_INVITATION',
          actor: userId,
          entityType: 'Party',
          entityId: party.id,
          newState: { invitationStatus: InvitationStatus.ACCEPTED },
          metadata: {
            partyName: party.name,
            partyRole: party.role,
          },
        });

        // Check if all parties have accepted (optimized - count pending instead of fetching all)
        const pendingCount = await prisma.party.count({
          where: {
            dealId: party.dealId,
            invitationStatus: { not: InvitationStatus.ACCEPTED }
          }
        });

        const allAccepted = pendingCount === 0;

        // If all parties accepted, update deal status to ACCEPTED
        if (allAccepted && party.deal.status === DealStatus.INVITED) {
          await prisma.deal.update({
            where: { id: party.dealId },
            data: { status: DealStatus.ACCEPTED },
          });

          // Create audit log for deal activation
          await createAuditLog({
            dealId: party.dealId,
            eventType: 'DEAL_ACTIVATED',
            actor: 'SYSTEM',
            entityType: 'Deal',
            entityId: party.dealId,
            newState: { status: DealStatus.ACCEPTED },
            metadata: {
              reason: 'All parties accepted invitations',
            },
          });

          console.log(`✅ Deal ${party.deal.dealNumber} activated - all parties accepted`);
        }

        return {
          success: true,
          message: 'Invitation accepted successfully!',
          dealId: party.dealId,
          dealNumber: party.deal.dealNumber,
          allPartiesAccepted: allAccepted,
        };
      } catch (error: any) {
        console.error('Error accepting invitation:', error);
        return reply.code(500).send({
          error: 'Failed to accept invitation',
          message: error.message,
        });
      }
    }
  );

  // Decline invitation (requires authentication)
  server.post(
    '/api/invitations/:token/decline',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const { reason } = request.body as { reason?: string };
      const userId = request.user!.id;

      try {
        const party = await dealsService.getPartyByInvitationToken(token);

        if (!party) {
          return reply.code(404).send({
            error: 'Invitation not found',
            message: 'This invitation link is invalid or has expired.'
          });
        }

        // Update party invitation status to DECLINED
        await prisma.party.update({
          where: { id: party.id },
          data: {
            invitationStatus: InvitationStatus.DECLINED,
            respondedAt: new Date(),
          },
        });

        // Create audit log with actual user ID
        await createAuditLog({
          dealId: party.dealId,
          eventType: 'PARTY_DECLINED_INVITATION',
          actor: userId,
          entityType: 'Party',
          entityId: party.id,
          newState: { invitationStatus: InvitationStatus.DECLINED },
          metadata: {
            partyName: party.name,
            partyRole: party.role,
            reason: reason || 'No reason provided',
          },
        });

        // TODO: Send notification email to deal creator about declined invitation

        return {
          success: true,
          message: 'Invitation declined successfully.',
          dealNumber: party.deal.dealNumber,
        };
      } catch (error: any) {
        console.error('Error declining invitation:', error);
        return reply.code(500).send({
          error: 'Failed to decline invitation',
          message: error.message
        });
      }
    }
  );
}
