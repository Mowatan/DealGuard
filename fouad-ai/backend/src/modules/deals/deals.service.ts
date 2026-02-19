import { prisma } from '../../lib/prisma';
import { createAuditLog, getAuditTrail } from '../../lib/audit';
import { emailSendingQueue } from '../../lib/queue';
import { DealStatus, InvitationStatus, AmendmentStatus, DeletionStatus, PartyResponseType, ServiceTier } from '@prisma/client';
import { calculateServiceFee, validateServiceTier } from './fee-calculator';
import crypto from 'crypto';
import * as progressService from '../progress/progress.service';
import { canUserAccessDeal } from '../../lib/authorization';

/**
 * Get the frontend base URL from environment
 * PRODUCTION: Must be configured via FRONTEND_URL env var
 * DEVELOPMENT: Falls back to localhost
 */
function getFrontendUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const url = process.env.FRONTEND_URL || (isProduction ? '' : 'http://localhost:3000');

  if (!url && isProduction) {
    console.error('❌ FRONTEND_URL is not configured in production!');
    return 'https://dealguard.org'; // Safe fallback for production
  }

  return url;
}

interface CreateDealParams {
  title: string;
  description?: string;
  transactionType?: 'SIMPLE' | 'MILESTONE_BASED';
  currency?: string;
  totalAmount?: number;

  // Service tier and fees
  serviceTier?: ServiceTier;
  estimatedValue?: number;

  parties: Array<{
    role: string;
    name: string;
    isOrganization: boolean;
    organizationId?: string;
    contactEmail: string;
    contactPhone?: string;
  }>;
  milestones?: Array<{
    name: string;
    description: string;
    amount: string;
    deadline?: string;
  }>;
  userId: string;
  creatorName?: string;
  creatorEmail?: string;
}

export async function createDeal(params: CreateDealParams) {
  // Default service tier to GOVERNANCE_ADVISORY if not provided
  const serviceTier = params.serviceTier || ServiceTier.GOVERNANCE_ADVISORY;

  // Validate service tier and calculate fees
  const validation = validateServiceTier(serviceTier, params.estimatedValue);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const feeResult = calculateServiceFee({
    serviceTier,
    estimatedValue: params.estimatedValue,
    currency: params.currency || 'EGP',
  });

  // Generate unique deal number
  const count = await prisma.deal.count();
  const dealNumber = `DEAL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  // Generate unique email for this deal
  const dealId = generateDealId();
  const emailAddress = `deal-${dealId}@${process.env.INBOUND_EMAIL_DOMAIN || 'fouad.ai'}`;

  const deal = await prisma.deal.create({
    data: {
      id: dealId,
      dealNumber,
      title: params.title,
      description: params.description,
      emailAddress,
      status: DealStatus.CREATED,
      transactionType: params.transactionType || 'SIMPLE',
      currency: params.currency || 'EGP',
      totalAmount: params.totalAmount,

      // Service tier and fees
      serviceTier,
      estimatedValue: params.estimatedValue,
      serviceFee: feeResult.serviceFee,

      parties: {
        create: params.parties.map((party) => ({
          role: party.role as any,
          name: party.name,
          isOrganization: party.isOrganization,
          organizationId: party.organizationId,
          contactEmail: party.contactEmail,
          contactPhone: party.contactPhone,
          invitationToken: generateInvitationToken(),
          invitationStatus: InvitationStatus.PENDING,
        })),
      },
    },
    include: {
      parties: true,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: deal.id,
    eventType: 'DEAL_CREATED',
    actor: params.userId,
    entityType: 'Deal',
    entityId: deal.id,
    newState: {
      status: deal.status,
      serviceTier: deal.serviceTier,
      serviceFee: deal.serviceFee,
    },
  });

  // Create contract with milestones if MILESTONE_BASED
  if (params.transactionType === 'MILESTONE_BASED' && params.milestones && params.milestones.length > 0) {
    const contract = await prisma.contract.create({
      data: {
        dealId: deal.id,
        version: 1,
        isEffective: false, // Will be effective after parties accept
        termsJson: {
          type: 'MILESTONE_BASED',
          createdAt: new Date().toISOString(),
          parties: deal.parties.map(p => ({
            id: p.id,
            role: p.role,
            name: p.name,
            email: p.contactEmail,
          })),
        },
        milestones: {
          create: params.milestones.map((milestone, index) => ({
            order: index + 1,
            title: milestone.name, // Use name as title
            name: milestone.name,
            description: milestone.description,
            status: 'PENDING',
            amount: parseFloat(milestone.amount),
            currency: deal.currency,
            deadline: milestone.deadline ? new Date(milestone.deadline) : null,
            milestoneType: 'PAYMENT',
            triggerType: index === 0 ? 'IMMEDIATE' : 'PERFORMANCE_BASED',
            triggerConfig: index === 0 ? {} : {
              dependsOnMilestoneId: `previous`, // Will be set to actual ID in a more complete implementation
              requiredStatuses: ['COMPLETED'],
            },
          })),
        },
      },
      include: {
        milestones: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Create audit log for contract creation
    await createAuditLog({
      dealId: deal.id,
      eventType: 'CONTRACT_CREATED',
      actor: params.userId,
      entityType: 'Contract',
      entityId: contract.id,
      newState: {
        version: contract.version,
        milestonesCount: contract.milestones.length,
      },
    });

    // Update deal's totalAmount with sum of milestone amounts
    const totalAmount = params.milestones.reduce((sum, m) => sum + parseFloat(m.amount), 0);
    await prisma.deal.update({
      where: { id: deal.id },
      data: { totalAmount },
    });
  }

  // Send email notifications to all parties
  const partiesListHtml = deal.parties
    .map(p => `<li style="margin-bottom: 8px;"><strong>${p.role}:</strong> ${p.name} (${p.contactEmail})</li>`)
    .join('');

  const creatorName = params.creatorName || 'A DealGuard user';
  const creatorEmail = params.creatorEmail || '';
  const baseUrl = getFrontendUrl();

  for (const party of deal.parties) {
    // Check if this party is the creator
    const isCreator = creatorEmail && party.contactEmail.toLowerCase() === creatorEmail.toLowerCase();

    if (isCreator) {
      // Send confirmation email to creator
      await emailSendingQueue.add(
        'send-deal-created',
        {
          to: party.contactEmail,
          subject: `Deal Created: ${deal.dealNumber}`,
          template: 'deal-created',
          variables: {
            dealNumber: deal.dealNumber,
            dealTitle: deal.title,
            dealEmailAddress: deal.emailAddress,
            yourRole: party.role,
            createdAt: new Date().toLocaleString(),
            partiesList: partiesListHtml,
          },
          dealId: deal.id,
          priority: 5,
        },
        { priority: 5 }
      );
    } else {
      // Send invitation email to other parties
      const confirmationLink = `${baseUrl}/confirm-invitation/${party.invitationToken}`;

      await emailSendingQueue.add(
        'send-party-invitation',
        {
          to: party.contactEmail,
          subject: `You've been invited to join a DealGuard transaction`,
          template: 'party-invitation',
          variables: {
            invitedName: party.name,
            inviterName: creatorName,
            dealTitle: deal.title,
            dealDescription: deal.description || 'No description provided',
            yourRole: party.role,
            dealNumber: deal.dealNumber,
            totalAmount: deal.totalAmount || 'TBD',
            currency: deal.currency || 'EGP',
            confirmationLink,
          },
          dealId: deal.id,
          priority: 5,
        },
        { priority: 5 }
      );
    }
  }

  // Initialize progress tracker
  try {
    await progressService.initializeProgressTracker(deal.id, params.userId);
  } catch (error) {
    console.error('Failed to initialize progress tracker:', error);
    // Don't block deal creation if progress tracker fails
  }

  return deal;
}

export async function listDeals(options: {
  status?: DealStatus;
  page: number;
  limit: number;
  userId: string; // REQUIRED: Filter deals by user membership
}) {
  const { status, page, limit, userId } = options;
  const skip = (page - 1) * limit;

  // Build where clause - filter by status AND user membership
  const where: any = {
    parties: {
      some: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    },
  };

  // Add optional status filter
  if (status) {
    where.status = status;
  }

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: {
        parties: true,
        _count: {
          select: {
            contracts: true,
            evidenceItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.deal.count({ where }),
  ]);

  return {
    deals,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getDealById(id: string, userId: string) {
  // First check if user has access to this deal
  const hasAccess = await canUserAccessDeal(id, userId);

  if (!hasAccess) {
    return null; // Return null to indicate not found (don't reveal if deal exists)
  }

  return prisma.deal.findUnique({
    where: { id },
    include: {
      parties: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      contracts: {
        where: { isEffective: true },
        include: {
          milestones: {
            orderBy: { order: 'asc' },
          },
        },
      },
      evidenceItems: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      custodyRecords: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function updateDealStatus(
  dealId: string,
  newStatus: DealStatus,
  actorId: string
) {
  // Check if user has access to this deal (case officers and above only)
  const user = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true },
  });

  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'CASE_OFFICER')) {
    throw new Error('Unauthorized: Only case officers and above can update deal status');
  }

  const deal = await prisma.deal.findUnique({ where: { id: dealId } });

  if (!deal) {
    throw new Error('Deal not found');
  }

  const oldStatus = deal.status;

  const updated = await prisma.deal.update({
    where: { id: dealId },
    data: { status: newStatus },
  });

  // Create audit log
  await createAuditLog({
    dealId,
    eventType: 'DEAL_STATUS_CHANGED',
    actor: actorId,
    entityType: 'Deal',
    entityId: dealId,
    oldState: { status: oldStatus },
    newState: { status: newStatus },
  });

  return updated;
}

export async function getDealAuditTrail(dealId: string, userId: string) {
  // Check if user has access to this deal
  const hasAccess = await canUserAccessDeal(dealId, userId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this deal');
  }

  return getAuditTrail(dealId);
}

export async function confirmPartyInvitation(token: string) {
  // Find the party by invitation token
  const party = await prisma.party.findUnique({
    where: { invitationToken: token },
    include: {
      deal: true,
    },
  });

  if (!party) {
    throw new Error('Invalid invitation token');
  }

  if (party.invitationStatus === InvitationStatus.ACCEPTED) {
    return {
      alreadyAccepted: true,
      party,
      deal: party.deal,
    };
  }

  if (party.invitationStatus === InvitationStatus.DECLINED) {
    throw new Error('This invitation has been declined');
  }

  // Update party status to ACCEPTED
  const updatedParty = await prisma.party.update({
    where: { id: party.id },
    data: {
      invitationStatus: InvitationStatus.ACCEPTED,
      respondedAt: new Date(),
    },
    include: {
      deal: {
        include: {
          parties: true,
        },
      },
    },
  });

  // Check if all parties have accepted
  const allPartiesAccepted = updatedParty.deal.parties.every(
    (p) => p.invitationStatus === InvitationStatus.ACCEPTED
  );

  // If all parties accepted, update deal status
  if (allPartiesAccepted) {
    await prisma.deal.update({
      where: { id: updatedParty.dealId },
      data: {
        allPartiesConfirmed: true,
        status: DealStatus.ACCEPTED,
      },
    });

    // Get or create a system user for audit logs
    const systemUser = await getOrCreateSystemUser();

    // Create audit log
    await createAuditLog({
      dealId: updatedParty.dealId,
      eventType: 'ALL_PARTIES_ACCEPTED',
      actor: systemUser.id,
      entityType: 'Deal',
      entityId: updatedParty.dealId,
      newState: { allPartiesConfirmed: true },
    });
  }

  // Get or create a system user for audit logs
  const systemUser = await getOrCreateSystemUser();

  // Create audit log for party acceptance
  await createAuditLog({
    dealId: updatedParty.dealId,
    eventType: 'PARTY_ACCEPTED',
    actor: systemUser.id,
    entityType: 'Party',
    entityId: updatedParty.id,
    newState: { invitationStatus: InvitationStatus.ACCEPTED },
    metadata: {
      partyName: updatedParty.name,
      partyRole: updatedParty.role,
    },
  });

  return {
    alreadyAccepted: false,
    party: updatedParty,
    deal: updatedParty.deal,
    allPartiesAccepted,
  };
}

export async function getPartyByInvitationToken(token: string) {
  return prisma.party.findUnique({
    where: { invitationToken: token },
    include: {
      deal: {
        include: {
          parties: true,
        },
      },
    },
  });
}

function generateDealId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function getOrCreateSystemUser() {
  const systemEmail = 'system@dealguard.internal';

  let systemUser = await prisma.user.findUnique({
    where: { email: systemEmail },
  });

  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: systemEmail,
        name: 'System',
        passwordHash: '',
        role: 'ADMIN',
      },
    });
  }

  return systemUser;
}

// ============================================================================
// DEAL AMENDMENT & DELETION SYSTEM
// ============================================================================

/**
 * Check if any party has agreed to the deal
 * Returns true if at least one party has ACCEPTED status
 */
export async function hasAnyPartyAgreed(dealId: string): Promise<boolean> {
  const acceptedParty = await prisma.party.findFirst({
    where: {
      dealId,
      invitationStatus: InvitationStatus.ACCEPTED,
    },
  });

  return acceptedParty !== null;
}

/**
 * Update deal details (Phase 1: Unilateral if no agreements)
 */
export async function updateDeal(
  dealId: string,
  updates: {
    title?: string;
    description?: string;
    totalAmount?: number;
    currency?: string;
  },
  userId: string
) {
  // Check if user has access to this deal
  const hasAccess = await canUserAccessDeal(dealId, userId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this deal');
  }

  // Check if any party has agreed
  const hasAgreed = await hasAnyPartyAgreed(dealId);

  if (hasAgreed) {
    throw new Error(
      'Cannot update deal unilaterally. At least one party has agreed. Please use the amendment proposal system.'
    );
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { parties: true },
  });

  if (!deal) {
    throw new Error('Deal not found');
  }

  const oldState = {
    title: deal.title,
    description: deal.description,
    totalAmount: deal.totalAmount?.toString(),
    currency: deal.currency,
  };

  // Apply updates
  const updatedDeal = await prisma.deal.update({
    where: { id: dealId },
    data: updates,
    include: { parties: true },
  });

  // Create audit log
  await createAuditLog({
    dealId,
    eventType: 'DEAL_UPDATED',
    actor: userId,
    entityType: 'Deal',
    entityId: dealId,
    oldState,
    newState: updates,
  });

  // Notify all parties about the change
  const baseUrl = getFrontendUrl();
  for (const party of deal.parties) {
    await emailSendingQueue.add(
      'send-deal-amended',
      {
        to: party.contactEmail,
        subject: `Deal Updated: ${deal.dealNumber}`,
        template: 'deal-amended',
        variables: {
          dealNumber: deal.dealNumber,
          dealTitle: updatedDeal.title,
          partyName: party.name,
          changes: updates,
          dealLink: `${baseUrl}/deals/${dealId}`,
        },
        dealId,
        priority: 5,
      },
      { priority: 5 }
    );
  }

  return updatedDeal;
}

/**
 * Delete deal (Phase 1: Unilateral if no agreements)
 */
export async function deleteDeal(dealId: string, userId: string, reason?: string) {
  // Check if user has access to this deal
  const hasAccess = await canUserAccessDeal(dealId, userId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this deal');
  }

  // Check if any party has agreed
  const hasAgreed = await hasAnyPartyAgreed(dealId);

  if (hasAgreed) {
    throw new Error(
      'Cannot delete deal unilaterally. At least one party has agreed. Please use the deletion request system.'
    );
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { parties: true },
  });

  if (!deal) {
    throw new Error('Deal not found');
  }

  // Store party info before deletion
  const parties = deal.parties.map(p => ({
    email: p.contactEmail,
    name: p.name,
  }));

  // Create audit log before deletion
  await createAuditLog({
    dealId,
    eventType: 'DEAL_DELETED',
    actor: userId,
    entityType: 'Deal',
    entityId: dealId,
    oldState: { status: deal.status },
    newState: { deleted: true, reason },
  });

  // Delete the deal (cascade will handle related records)
  await prisma.deal.delete({
    where: { id: dealId },
  });

  // Notify all parties about the deletion
  for (const party of parties) {
    await emailSendingQueue.add(
      'send-deal-cancelled',
      {
        to: party.email,
        subject: `Deal Cancelled: ${deal.dealNumber}`,
        template: 'deal-cancelled',
        variables: {
          dealNumber: deal.dealNumber,
          dealTitle: deal.title,
          partyName: party.name,
          reason: reason || 'No reason provided',
        },
        dealId,
        priority: 5,
      },
      { priority: 5 }
    );
  }

  return { success: true, message: 'Deal deleted successfully' };
}

/**
 * Get all amendments for a deal
 */
export async function getDealAmendments(dealId: string, userId: string) {
  // Check if user has access to this deal
  const hasAccess = await canUserAccessDeal(dealId, userId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this deal');
  }

  const amendments = await prisma.dealAmendment.findMany({
    where: { dealId },
    include: {
      responses: {
        include: {
          party: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return amendments;
}

/**
 * Propose deal amendment (Phase 2: When parties have agreed)
 */
export async function proposeDealAmendment(
  dealId: string,
  proposedChanges: {
    title?: string;
    description?: string;
    totalAmount?: number;
    currency?: string;
  },
  userId: string,
  userName: string
) {
  // Check if user has access to this deal
  const hasAccess = await canUserAccessDeal(dealId, userId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this deal');
  }

  // Verify at least one party has agreed
  const hasAgreed = await hasAnyPartyAgreed(dealId);

  if (!hasAgreed) {
    throw new Error(
      'No parties have agreed yet. You can update the deal directly without requiring approval.'
    );
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { parties: true },
  });

  if (!deal) {
    throw new Error('Deal not found');
  }

  // Create amendment proposal
  const amendment = await prisma.dealAmendment.create({
    data: {
      dealId,
      proposedBy: userId,
      proposedByName: userName,
      proposedChanges,
      status: AmendmentStatus.PENDING,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId,
    eventType: 'AMENDMENT_PROPOSED',
    actor: userId,
    entityType: 'DealAmendment',
    entityId: amendment.id,
    newState: { proposedChanges },
  });

  // Notify all parties about the proposed amendment
  const baseUrl = getFrontendUrl();
  for (const party of deal.parties) {
    const respondLink = `${baseUrl}/amendments/${amendment.id}`;

    await emailSendingQueue.add(
      'send-amendment-proposed',
      {
        to: party.contactEmail,
        subject: `Amendment Proposed for Deal: ${deal.dealNumber}`,
        template: 'amendment-proposed',
        variables: {
          dealNumber: deal.dealNumber,
          dealTitle: deal.title,
          partyName: party.name,
          proposedBy: userName,
          proposedChanges,
          respondLink,
        },
        dealId,
        priority: 5,
      },
      { priority: 5 }
    );
  }

  return amendment;
}

/**
 * Propose deal deletion (Phase 2: When parties have agreed)
 */
export async function proposeDealDeletion(
  dealId: string,
  reason: string,
  userId: string,
  userName: string
) {
  // Check if user has access to this deal
  const hasAccess = await canUserAccessDeal(dealId, userId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this deal');
  }

  // Verify at least one party has agreed
  const hasAgreed = await hasAnyPartyAgreed(dealId);

  if (!hasAgreed) {
    throw new Error(
      'No parties have agreed yet. You can delete the deal directly without requiring approval.'
    );
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { parties: true },
  });

  if (!deal) {
    throw new Error('Deal not found');
  }

  // Create deletion request
  const deletionRequest = await prisma.dealDeletionRequest.create({
    data: {
      dealId,
      requestedBy: userId,
      requestedByName: userName,
      reason,
      status: DeletionStatus.PENDING,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId,
    eventType: 'DELETION_PROPOSED',
    actor: userId,
    entityType: 'DealDeletionRequest',
    entityId: deletionRequest.id,
    newState: { reason },
  });

  // Notify all parties about the proposed deletion
  const baseUrl = getFrontendUrl();
  for (const party of deal.parties) {
    const respondLink = `${baseUrl}/deletion-requests/${deletionRequest.id}`;

    await emailSendingQueue.add(
      'send-deletion-proposed',
      {
        to: party.contactEmail,
        subject: `Deletion Requested for Deal: ${deal.dealNumber}`,
        template: 'deletion-proposed',
        variables: {
          dealNumber: deal.dealNumber,
          dealTitle: deal.title,
          partyName: party.name,
          requestedBy: userName,
          reason,
          respondLink,
        },
        dealId,
        priority: 5,
      },
      { priority: 5 }
    );
  }

  return deletionRequest;
}

/**
 * Party responds to amendment proposal
 */
export async function respondToAmendment(
  amendmentId: string,
  partyId: string,
  responseType: 'APPROVE' | 'DISPUTE',
  notes?: string
) {
  const amendment = await prisma.dealAmendment.findUnique({
    where: { id: amendmentId },
    include: {
      deal: {
        include: { parties: true },
      },
      responses: true,
    },
  });

  if (!amendment) {
    throw new Error('Amendment not found');
  }

  if (amendment.status !== AmendmentStatus.PENDING) {
    throw new Error('Amendment is no longer pending');
  }

  // Check if party already responded
  const existingResponse = amendment.responses.find(r => r.partyId === partyId);
  if (existingResponse) {
    throw new Error('Party has already responded to this amendment');
  }

  // Create response
  const response = await prisma.partyAmendmentResponse.create({
    data: {
      amendmentId,
      partyId,
      responseType: responseType as PartyResponseType,
      notes,
    },
  });

  // Check if all parties have responded
  const allPartiesCount = amendment.deal.parties.length;
  const responsesCount = amendment.responses.length + 1; // +1 for the new response

  if (responsesCount === allPartiesCount) {
    // All parties responded - check if any disputed
    const allResponses = [...amendment.responses, response];
    const hasDispute = allResponses.some(r => r.responseType === PartyResponseType.DISPUTE);

    if (hasDispute) {
      // At least one dispute - escalate to admin
      await prisma.dealAmendment.update({
        where: { id: amendmentId },
        data: { status: AmendmentStatus.DISPUTED },
      });

      // Notify proposer about dispute
      await emailSendingQueue.add(
        'send-amendment-disputed',
        {
          to: amendment.proposedByName, // This should be an email
          subject: `Amendment Disputed for Deal: ${amendment.deal.dealNumber}`,
          template: 'amendment-disputed',
          variables: {
            dealNumber: amendment.deal.dealNumber,
            dealTitle: amendment.deal.title,
          },
          dealId: amendment.dealId,
          priority: 5,
        },
        { priority: 5 }
      );
    } else {
      // All approved - execute the amendment
      await executeAmendment(amendmentId);
    }
  }

  // Create audit log
  await createAuditLog({
    dealId: amendment.dealId,
    eventType: 'AMENDMENT_RESPONSE',
    actor: partyId,
    entityType: 'PartyAmendmentResponse',
    entityId: response.id,
    newState: { responseType, notes },
  });

  return response;
}

/**
 * Party responds to deletion request
 */
export async function respondToDeletion(
  deletionRequestId: string,
  partyId: string,
  responseType: 'APPROVE' | 'DISPUTE',
  notes?: string
) {
  const deletionRequest = await prisma.dealDeletionRequest.findUnique({
    where: { id: deletionRequestId },
    include: {
      deal: {
        include: { parties: true },
      },
      responses: true,
    },
  });

  if (!deletionRequest) {
    throw new Error('Deletion request not found');
  }

  if (deletionRequest.status !== DeletionStatus.PENDING) {
    throw new Error('Deletion request is no longer pending');
  }

  // Check if party already responded
  const existingResponse = deletionRequest.responses.find(r => r.partyId === partyId);
  if (existingResponse) {
    throw new Error('Party has already responded to this deletion request');
  }

  // Create response
  const response = await prisma.partyDeletionResponse.create({
    data: {
      deletionRequestId,
      partyId,
      responseType: responseType as PartyResponseType,
      notes,
    },
  });

  // Check if all parties have responded
  const allPartiesCount = deletionRequest.deal.parties.length;
  const responsesCount = deletionRequest.responses.length + 1; // +1 for the new response

  if (responsesCount === allPartiesCount) {
    // All parties responded - check if any disputed
    const allResponses = [...deletionRequest.responses, response];
    const hasDispute = allResponses.some(r => r.responseType === PartyResponseType.DISPUTE);

    if (hasDispute) {
      // At least one dispute - escalate to admin
      await prisma.dealDeletionRequest.update({
        where: { id: deletionRequestId },
        data: { status: DeletionStatus.DISPUTED },
      });

      // Notify requester about dispute (admin will need to resolve)
      // In a real system, you'd notify admins here
    } else {
      // All approved - execute the deletion
      await executeDeletion(deletionRequestId);
    }
  }

  // Create audit log
  await createAuditLog({
    dealId: deletionRequest.dealId,
    eventType: 'DELETION_RESPONSE',
    actor: partyId,
    entityType: 'PartyDeletionResponse',
    entityId: response.id,
    newState: { responseType, notes },
  });

  return response;
}

/**
 * Execute approved amendment
 */
async function executeAmendment(amendmentId: string) {
  const amendment = await prisma.dealAmendment.findUnique({
    where: { id: amendmentId },
    include: {
      deal: {
        include: { parties: true },
      },
    },
  });

  if (!amendment) {
    throw new Error('Amendment not found');
  }

  const changes = amendment.proposedChanges as any;

  // Apply the changes to the deal
  const updatedDeal = await prisma.deal.update({
    where: { id: amendment.dealId },
    data: {
      title: changes.title,
      description: changes.description,
      totalAmount: changes.totalAmount,
      currency: changes.currency,
    },
  });

  // Update amendment status
  await prisma.dealAmendment.update({
    where: { id: amendmentId },
    data: { status: AmendmentStatus.APPLIED },
  });

  // Create audit log
  await createAuditLog({
    dealId: amendment.dealId,
    eventType: 'AMENDMENT_APPLIED',
    actor: amendment.proposedBy,
    entityType: 'Deal',
    entityId: amendment.dealId,
    newState: changes,
  });

  // Notify all parties
  const baseUrl = getFrontendUrl();
  for (const party of amendment.deal.parties) {
    await emailSendingQueue.add(
      'send-amendment-approved',
      {
        to: party.contactEmail,
        subject: `Amendment Approved for Deal: ${amendment.deal.dealNumber}`,
        template: 'amendment-approved',
        variables: {
          dealNumber: amendment.deal.dealNumber,
          dealTitle: updatedDeal.title,
          partyName: party.name,
          changes,
          dealLink: `${baseUrl}/deals/${amendment.dealId}`,
        },
        dealId: amendment.dealId,
        priority: 5,
      },
      { priority: 5 }
    );
  }

  return updatedDeal;
}

/**
 * Execute approved deletion
 */
async function executeDeletion(deletionRequestId: string) {
  const deletionRequest = await prisma.dealDeletionRequest.findUnique({
    where: { id: deletionRequestId },
    include: {
      deal: {
        include: { parties: true },
      },
    },
  });

  if (!deletionRequest) {
    throw new Error('Deletion request not found');
  }

  const deal = deletionRequest.deal;
  const parties = deal.parties.map(p => ({
    email: p.contactEmail,
    name: p.name,
  }));

  // Update deletion request status
  await prisma.dealDeletionRequest.update({
    where: { id: deletionRequestId },
    data: { status: DeletionStatus.EXECUTED },
  });

  // Create audit log
  await createAuditLog({
    dealId: deal.id,
    eventType: 'DEAL_DELETED_APPROVED',
    actor: deletionRequest.requestedBy,
    entityType: 'Deal',
    entityId: deal.id,
    oldState: { status: deal.status },
    newState: { deleted: true, reason: deletionRequest.reason },
  });

  // Delete the deal
  await prisma.deal.delete({
    where: { id: deal.id },
  });

  // Notify all parties
  for (const party of parties) {
    await emailSendingQueue.add(
      'send-deletion-approved',
      {
        to: party.email,
        subject: `Deletion Approved for Deal: ${deal.dealNumber}`,
        template: 'deletion-approved',
        variables: {
          dealNumber: deal.dealNumber,
          dealTitle: deal.title,
          partyName: party.name,
          reason: deletionRequest.reason,
        },
        dealId: deal.id,
        priority: 5,
      },
      { priority: 5 }
    );
  }

  return { success: true, message: 'Deal deleted successfully after approval' };
}

/**
 * Get all disputed amendments (admin only)
 */
export async function getDisputedAmendments() {
  const amendments = await prisma.dealAmendment.findMany({
    where: {
      status: AmendmentStatus.DISPUTED,
    },
    include: {
      deal: {
        select: {
          id: true,
          dealNumber: true,
          title: true,
        },
      },
      responses: {
        include: {
          party: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return amendments;
}

/**
 * Resolve amendment dispute (admin override)
 */
export async function resolveAmendmentDispute(
  amendmentId: string,
  resolutionType: 'APPROVE' | 'REJECT' | 'REQUEST_COMPROMISE',
  notes: string,
  adminId: string,
  adminName: string
) {
  const amendment = await prisma.dealAmendment.findUnique({
    where: { id: amendmentId },
    include: {
      deal: {
        include: { parties: true },
      },
    },
  });

  if (!amendment) {
    throw new Error('Amendment not found');
  }

  if (amendment.status !== AmendmentStatus.DISPUTED) {
    throw new Error('Amendment is not in disputed status');
  }

  let newStatus: AmendmentStatus;
  let eventType: string;

  if (resolutionType === 'APPROVE') {
    // Admin approves - execute the amendment
    newStatus = AmendmentStatus.APPROVED;
    eventType = 'AMENDMENT_ADMIN_APPROVED';

    // Apply the amendment
    await executeAmendment(amendmentId);
  } else if (resolutionType === 'REJECT') {
    // Admin rejects - amendment is rejected
    newStatus = AmendmentStatus.REJECTED;
    eventType = 'AMENDMENT_ADMIN_REJECTED';

    await prisma.dealAmendment.update({
      where: { id: amendmentId },
      data: { status: newStatus },
    });
  } else {
    // Admin requests compromise - keep as disputed
    newStatus = AmendmentStatus.DISPUTED;
    eventType = 'AMENDMENT_COMPROMISE_REQUESTED';
  }

  // Create audit log
  await createAuditLog({
    dealId: amendment.dealId,
    eventType,
    actor: adminId,
    entityType: 'DealAmendment',
    entityId: amendmentId,
    oldState: { status: amendment.status },
    newState: { status: newStatus, resolutionType, adminNotes: notes },
  });

  // Notify all parties
  const parties = amendment.deal.parties.map(p => ({
    email: p.contactEmail,
    name: p.name,
  }));

  for (const party of parties) {
    await emailSendingQueue.add(
      'send-amendment-admin-resolution',
      {
        to: party.email,
        subject: `Admin Resolution for Deal ${amendment.deal.dealNumber} Amendment`,
        template: 'amendment-admin-resolution',
        variables: {
          dealNumber: amendment.deal.dealNumber,
          dealTitle: amendment.deal.title,
          partyName: party.name,
          resolutionType,
          adminNotes: notes,
          proposerName: amendment.proposedByName,
        },
        dealId: amendment.dealId,
        priority: 8,
      },
      { priority: 8 }
    );
  }

  return {
    success: true,
    message: `Amendment ${resolutionType.toLowerCase().replace('_', ' ')}`,
    amendment: await prisma.dealAmendment.findUnique({
      where: { id: amendmentId },
      include: {
        responses: {
          include: {
            party: true,
          },
        },
      },
    }),
  };
}
