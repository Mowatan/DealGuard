import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { DisputeStatus, MilestoneStatus } from '@prisma/client';

// ============================================================================
// CREATE DISPUTE
// ============================================================================

interface CreateDisputeParams {
  dealId: string;
  milestoneId?: string;
  issueType: string;
  narrative: string;
  raisedBy: string;
}

export async function createDispute(params: CreateDisputeParams) {
  const { dealId, milestoneId, issueType, narrative, raisedBy } = params;

  // Verify deal exists
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    throw new Error('Deal not found');
  }

  // If milestone is provided, verify it exists and freeze it
  let milestoneFrozen = false;
  if (milestoneId) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Freeze milestone by setting status to DISPUTED
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: MilestoneStatus.DISPUTED },
    });

    milestoneFrozen = true;
  }

  // Create dispute
  const dispute = await prisma.dispute.create({
    data: {
      dealId,
      milestoneId,
      issueType,
      reason: narrative, // Legacy field
      narrative,
      raisedBy,
      status: DisputeStatus.OPENED,
      milestoneFrozen,
    },
    include: {
      deal: {
        select: {
          id: true,
          dealNumber: true,
          title: true,
        },
      },
    },
  });

  // Create audit log
  await createAuditLog({
    dealId,
    eventType: 'DISPUTE_CREATED',
    actor: raisedBy,
    entityType: 'Dispute',
    entityId: dispute.id,
    newState: {
      issueType,
      milestoneId,
      milestoneFrozen,
    },
  });

  return dispute;
}

// ============================================================================
// ADD MEDIATION NOTE
// ============================================================================

export async function addMediationNote(
  disputeId: string,
  note: string,
  mediatorId: string
) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
  });

  if (!dispute) {
    throw new Error('Dispute not found');
  }

  // Add note to proposed resolution (using JSON field)
  const currentResolution = (dispute.proposedResolution as any) || {};
  const notes = currentResolution.mediationNotes || [];

  const updatedResolution = {
    ...currentResolution,
    mediationNotes: [
      ...notes,
      {
        note,
        mediatorId,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const updatedDispute = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      proposedResolution: updatedResolution,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: dispute.dealId,
    eventType: 'DISPUTE_MEDIATION_NOTE_ADDED',
    actor: mediatorId,
    entityType: 'Dispute',
    entityId: disputeId,
    metadata: { note },
  });

  return updatedDispute;
}

// ============================================================================
// RESOLVE DISPUTE
// ============================================================================

export async function resolveDispute(
  disputeId: string,
  resolutionNotes: string,
  resolvedBy: string
) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      deal: true,
    },
  });

  if (!dispute) {
    throw new Error('Dispute not found');
  }

  if (dispute.status === DisputeStatus.RESOLVED) {
    throw new Error('Dispute already resolved');
  }

  // Update dispute status to RESOLVED
  const updatedDispute = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: DisputeStatus.RESOLVED,
      resolvedBy,
      resolvedAt: new Date(),
      finalResolution: {
        notes: resolutionNotes,
        resolvedBy,
        resolvedAt: new Date().toISOString(),
      },
    },
  });

  // If milestone was frozen, restore it to IN_PROGRESS
  if (dispute.milestoneFrozen && dispute.milestoneId) {
    await prisma.milestone.update({
      where: { id: dispute.milestoneId },
      data: { status: MilestoneStatus.IN_PROGRESS },
    });

    // Log milestone restoration
    await createAuditLog({
      dealId: dispute.dealId,
      eventType: 'MILESTONE_RESTORED_FROM_DISPUTE',
      actor: resolvedBy,
      entityType: 'Milestone',
      entityId: dispute.milestoneId,
      newState: { status: MilestoneStatus.IN_PROGRESS },
      metadata: { disputeId },
    });
  }

  // Create audit log for dispute resolution
  await createAuditLog({
    dealId: dispute.dealId,
    eventType: 'DISPUTE_RESOLVED',
    actor: resolvedBy,
    entityType: 'Dispute',
    entityId: disputeId,
    oldState: { status: dispute.status },
    newState: { status: DisputeStatus.RESOLVED },
    metadata: { resolutionNotes },
  });

  return updatedDispute;
}

// ============================================================================
// LIST DISPUTES BY DEAL
// ============================================================================

export async function listDisputesByDeal(dealId: string) {
  return prisma.dispute.findMany({
    where: { dealId },
    include: {
      deal: {
        select: {
          id: true,
          dealNumber: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ============================================================================
// GET DISPUTE DETAILS
// ============================================================================

export async function getDisputeById(disputeId: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      deal: {
        include: {
          parties: {
            select: {
              id: true,
              name: true,
              role: true,
              contactEmail: true,
            },
          },
        },
      },
    },
  });

  if (!dispute) {
    throw new Error('Dispute not found');
  }

  return dispute;
}

// ============================================================================
// LIST ALL OPEN DISPUTES (ADMIN VIEW)
// ============================================================================

export async function listOpenDisputes() {
  return prisma.dispute.findMany({
    where: {
      status: {
        in: [
          DisputeStatus.OPENED,
          DisputeStatus.EVIDENCE_COLLECTION,
          DisputeStatus.SETTLEMENT_PROPOSED,
          DisputeStatus.ADMIN_REVIEW,
        ],
      },
    },
    include: {
      deal: {
        select: {
          id: true,
          dealNumber: true,
          title: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' }, // Oldest first
  });
}
