import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { emailSendingQueue } from '../../lib/queue';
import { DealStatus, MilestoneStatus, InvitationStatus } from '@prisma/client';

/**
 * Centralized Deal State Machine Service
 *
 * Single source of truth for all deal state transitions.
 * Prevents duplication and ensures consistent validation across the platform.
 */

interface DealActivationResult {
  activated: boolean;
  status: DealStatus;
  reason: string;
  nextStep?: string;
}

/**
 * Check if a deal can be activated and activate it if conditions are met
 *
 * Activation Requirements:
 * 1. All parties must have accepted invitations
 * 2. If deal has milestones, all must be in APPROVED status
 * 3. Deal must be in INVITED or PENDING_NEGOTIATION status
 */
export async function checkAndActivateDeal(
  dealId: string,
  actor: string = 'SYSTEM'
): Promise<DealActivationResult> {
  // Fetch deal with all related data
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      parties: true,
      contracts: {
        where: { isEffective: true },
        include: {
          milestones: true,
        },
      },
    },
  });

  if (!deal) {
    throw new Error('Deal not found');
  }

  // Already activated
  if (deal.status === DealStatus.ACCEPTED) {
    return {
      activated: false,
      status: DealStatus.ACCEPTED,
      reason: 'Deal already activated',
    };
  }

  // Check 1: All parties must have accepted invitations
  const pendingParties = deal.parties.filter(
    p => p.invitationStatus !== InvitationStatus.ACCEPTED
  );

  if (pendingParties.length > 0) {
    return {
      activated: false,
      status: deal.status,
      reason: `Waiting for ${pendingParties.length} parties to accept invitations`,
      nextStep: 'Parties must accept invitations',
    };
  }

  // Check 2: If milestones exist, all must be approved
  const contract = deal.contracts[0];
  if (contract && contract.milestones.length > 0) {
    const pendingMilestones = contract.milestones.filter(
      m => m.status !== MilestoneStatus.APPROVED
    );

    if (pendingMilestones.length > 0) {
      // Deal should be in PENDING_NEGOTIATION if has milestones
      if (deal.status !== DealStatus.PENDING_NEGOTIATION) {
        await transitionDealStatus(
          dealId,
          deal.status,
          DealStatus.PENDING_NEGOTIATION,
          actor,
          'All parties accepted - milestone negotiation begins'
        );
      }

      return {
        activated: false,
        status: DealStatus.PENDING_NEGOTIATION,
        reason: `Waiting for ${pendingMilestones.length} milestones to be approved`,
        nextStep: 'All parties must agree on all milestones',
      };
    }
  }

  // All conditions met - activate deal!
  await transitionDealStatus(
    dealId,
    deal.status,
    DealStatus.ACCEPTED,
    actor,
    contract && contract.milestones.length > 0
      ? 'All parties agreed on all milestones'
      : 'All parties accepted invitations - no milestones to negotiate'
  );

  console.log(`✅ Deal ${deal.dealNumber} ACTIVATED`);

  return {
    activated: true,
    status: DealStatus.ACCEPTED,
    reason: 'Deal successfully activated',
  };
}

/**
 * Transition deal from one status to another with validation
 */
export async function transitionDealStatus(
  dealId: string,
  fromStatus: DealStatus,
  toStatus: DealStatus,
  actor: string,
  reason: string
): Promise<void> {
  // Validate transition is allowed
  const allowedTransitions: Record<DealStatus, DealStatus[]> = {
    CREATED: [DealStatus.INVITED, DealStatus.CANCELLED],
    INVITED: [DealStatus.PENDING_NEGOTIATION, DealStatus.ACCEPTED, DealStatus.CANCELLED],
    PENDING_NEGOTIATION: [DealStatus.ACCEPTED, DealStatus.CANCELLED, DealStatus.DISPUTED],
    ACCEPTED: [DealStatus.FUNDED, DealStatus.DISPUTED, DealStatus.CANCELLED],
    FUNDED: [DealStatus.IN_PROGRESS, DealStatus.DISPUTED],
    IN_PROGRESS: [DealStatus.READY_TO_RELEASE, DealStatus.DISPUTED],
    READY_TO_RELEASE: [DealStatus.RELEASED, DealStatus.DISPUTED],
    RELEASED: [DealStatus.COMPLETED],
    COMPLETED: [],
    DISPUTED: [DealStatus.IN_PROGRESS, DealStatus.CANCELLED],
    CANCELLED: [],
  };

  const allowed = allowedTransitions[fromStatus];
  if (!allowed || !allowed.includes(toStatus)) {
    throw new Error(
      `Invalid state transition: ${fromStatus} → ${toStatus}`
    );
  }

  // Update deal status
  await prisma.deal.update({
    where: { id: dealId },
    data: {
      status: toStatus,
      allPartiesConfirmed: toStatus === DealStatus.ACCEPTED ? true : undefined,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId,
    eventType: toStatus === DealStatus.ACCEPTED ? 'DEAL_ACTIVATED' : 'DEAL_STATUS_CHANGED',
    actor,
    entityType: 'Deal',
    entityId: dealId,
    oldState: { status: fromStatus },
    newState: { status: toStatus },
    metadata: { reason },
  });

  // Send appropriate notifications
  if (toStatus === DealStatus.ACCEPTED) {
    await sendDealActivationEmails(dealId);
  } else if (toStatus === DealStatus.PENDING_NEGOTIATION) {
    await sendMilestoneNegotiationStartedEmails(dealId);
  }

  console.log(`📊 Deal status transition: ${fromStatus} → ${toStatus} (${reason})`);
}

/**
 * Initialize milestones for negotiation
 */
export async function initializeMilestoneNegotiation(dealId: string): Promise<void> {
  const contract = await prisma.contract.findFirst({
    where: { dealId, isEffective: true },
    include: { milestones: true },
  });

  if (!contract || contract.milestones.length === 0) {
    return; // No milestones to initialize
  }

  // Set all milestones to PENDING_RESPONSES
  await prisma.milestone.updateMany({
    where: { contractId: contract.id },
    data: { status: MilestoneStatus.PENDING_RESPONSES },
  });

  console.log(`📋 Initialized ${contract.milestones.length} milestones for negotiation`);
}

/**
 * Send deal activation emails to all parties
 */
async function sendDealActivationEmails(dealId: string): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      parties: true,
      contracts: {
        where: { isEffective: true },
        include: { milestones: true },
      },
    },
  });

  if (!deal) return;

  const frontendUrl = process.env.FRONTEND_URL || 'https://dealguard.org';
  const contract = deal.contracts[0];

  for (const party of deal.parties) {
    await emailSendingQueue.add('send-deal-activated', {
      to: party.contactEmail,
      subject: `Deal Activated: ${deal.dealNumber}`,
      template: 'deal-activated',
      variables: {
        partyName: party.name,
        dealNumber: deal.dealNumber,
        dealTitle: deal.title || deal.dealNumber,
        milestonesCount: contract?.milestones.length || 0,
        dealLink: `${frontendUrl}/deals/${deal.id}`,
      },
      dealId: deal.id,
      priority: 5,
    });
  }
}

/**
 * Send milestone negotiation started emails
 */
async function sendMilestoneNegotiationStartedEmails(dealId: string): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      parties: true,
      contracts: {
        where: { isEffective: true },
        include: { milestones: true },
      },
    },
  });

  if (!deal) return;

  const frontendUrl = process.env.FRONTEND_URL || 'https://dealguard.org';
  const contract = deal.contracts[0];

  for (const party of deal.parties) {
    await emailSendingQueue.add('send-milestone-negotiation-started', {
      to: party.contactEmail,
      subject: `Action Required: Review Milestones for ${deal.dealNumber}`,
      template: 'milestone-negotiation-started',
      variables: {
        partyName: party.name,
        dealNumber: deal.dealNumber,
        dealTitle: deal.title || deal.dealNumber,
        milestonesCount: contract?.milestones.length || 0,
        dealLink: `${frontendUrl}/deals/${deal.id}`,
      },
      dealId: deal.id,
      priority: 6,
    });
  }
}
