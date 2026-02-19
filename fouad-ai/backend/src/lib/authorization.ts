import { prisma } from './prisma';

/**
 * Shared authorization utilities for enforcing data isolation
 */

/**
 * Check if a user has access to a deal (is creator, party member, or has admin role)
 */
export async function canUserAccessDeal(dealId: string, userId: string): Promise<boolean> {
  // Get user to check role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    return false;
  }

  // Admins and case officers can access all deals
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'CASE_OFFICER') {
    return true;
  }

  // Check if user is the creator of the deal
  const deal = await prisma.deal.findFirst({
    where: {
      id: dealId,
      creatorId: userId,
    },
  });

  if (deal) {
    return true;
  }

  // Check if user is a member of any party in this deal
  const partyMember = await prisma.partyMember.findFirst({
    where: {
      userId: userId,
      party: {
        dealId: dealId,
      },
    },
  });

  return partyMember !== null;
}

/**
 * Get dealId from evidenceId and check access
 */
export async function canUserAccessEvidence(evidenceId: string, userId: string): Promise<boolean> {
  const evidence = await prisma.evidenceItem.findUnique({
    where: { id: evidenceId },
    select: { dealId: true },
  });

  if (!evidence) {
    return false;
  }

  return canUserAccessDeal(evidence.dealId, userId);
}

/**
 * Get dealId from contractId and check access
 */
export async function canUserAccessContract(contractId: string, userId: string): Promise<boolean> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { dealId: true },
  });

  if (!contract) {
    return false;
  }

  return canUserAccessDeal(contract.dealId, userId);
}

/**
 * Get dealId from milestoneId and check access
 */
export async function canUserAccessMilestone(milestoneId: string, userId: string): Promise<boolean> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: {
      contract: {
        select: { dealId: true },
      },
    },
  });

  if (!milestone) {
    return false;
  }

  return canUserAccessDeal(milestone.contract.dealId, userId);
}

/**
 * Get dealId from custodyRecordId and check access
 */
export async function canUserAccessCustodyRecord(recordId: string, userId: string): Promise<boolean> {
  const record = await prisma.custodyRecord.findUnique({
    where: { id: recordId },
    select: { dealId: true },
  });

  if (!record) {
    return false;
  }

  return canUserAccessDeal(record.dealId, userId);
}

/**
 * Check if user has admin or case officer role
 */
export async function isAdminOrCaseOfficer(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    return false;
  }

  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'CASE_OFFICER';
}

/**
 * Check if user has admin role
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    return false;
  }

  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
}

/**
 * Check if user is a member of a specific party
 */
export async function isUserPartyMember(userId: string, partyId: string): Promise<boolean> {
  const membership = await prisma.partyMember.findFirst({
    where: {
      userId: userId,
      partyId: partyId,
    },
  });

  return membership !== null;
}
