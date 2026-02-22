import { prisma } from '../lib/prisma';

/**
 * Party Repository
 *
 * Centralized data access for Party-related queries.
 * Breaks circular dependencies between modules.
 */

/**
 * Find party by invitation token
 * Used by both invitations and deals modules
 */
export async function findPartyByInvitationToken(token: string) {
  return prisma.party.findUnique({
    where: { invitationToken: token },
    include: {
      deal: {
        include: {
          parties: {
            select: {
              id: true,
              name: true,
              role: true,
              invitationStatus: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Check if all parties in a deal have accepted invitations
 */
export async function checkAllPartiesAccepted(dealId: string): Promise<boolean> {
  const pendingCount = await prisma.party.count({
    where: {
      dealId,
      invitationStatus: { not: 'ACCEPTED' },
    },
  });

  return pendingCount === 0;
}

/**
 * Get all parties for a deal
 */
export async function findPartiesByDeal(dealId: string) {
  return prisma.party.findMany({
    where: { dealId },
    include: {
      members: true,
    },
  });
}
