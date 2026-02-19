import { FastifyInstance } from 'fastify';
import * as dealsService from '../deals/deals.service';

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

  // Accept invitation (public endpoint - no auth required initially)
  server.post(
    '/api/invitations/:token/accept',
    async (request, reply) => {
      const { token } = request.params as { token: string };

      try {
        // Confirm the invitation
        const result = await dealsService.confirmPartyInvitation(token);

        if (result.alreadyAccepted) {
          return {
            success: true,
            alreadyAccepted: true,
            message: 'This invitation has already been accepted.',
            dealId: result.deal.id,
            dealNumber: result.deal.dealNumber,
          };
        }

        return {
          success: true,
          message: 'Invitation accepted successfully!',
          dealId: result.deal.id,
          dealNumber: result.deal.dealNumber,
          allPartiesAccepted: result.allPartiesAccepted || false,
        };
      } catch (error: any) {
        console.error('Error accepting invitation:', error);

        if (error.message.includes('Invalid invitation')) {
          return reply.code(404).send({
            error: 'Invalid invitation',
            message: 'This invitation link is invalid or has expired.'
          });
        }

        if (error.message.includes('declined')) {
          return reply.code(400).send({
            error: 'Invitation already declined',
            message: 'This invitation has been declined and cannot be accepted.'
          });
        }

        return reply.code(500).send({
          error: 'Failed to accept invitation',
          message: error.message
        });
      }
    }
  );

  // Decline invitation (public endpoint - no auth required)
  server.post(
    '/api/invitations/:token/decline',
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const { reason } = request.body as { reason?: string };

      try {
        const party = await dealsService.getPartyByInvitationToken(token);

        if (!party) {
          return reply.code(404).send({
            error: 'Invitation not found',
            message: 'This invitation link is invalid or has expired.'
          });
        }

        // Update party invitation status to DECLINED
        const { prisma } = await import('../../lib/prisma');
        const { InvitationStatus } = await import('@prisma/client');

        await prisma.party.update({
          where: { id: party.id },
          data: {
            invitationStatus: InvitationStatus.DECLINED,
            respondedAt: new Date(),
          },
        });

        // Create audit log
        const { createAuditLog } = await import('../../lib/audit');
        await createAuditLog({
          dealId: party.dealId,
          eventType: 'PARTY_DECLINED_INVITATION',
          actor: 'SYSTEM', // No user ID since this is a public endpoint
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
