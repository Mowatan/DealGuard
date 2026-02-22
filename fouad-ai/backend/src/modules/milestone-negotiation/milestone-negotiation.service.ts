import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { emailSendingQueue } from '../../lib/queue';
import { Prisma } from '@prisma/client';
import type { MilestoneResponseType, MilestoneStatus, DealStatus } from '@prisma/client';

// Helper function to get frontend URL
function getFrontendUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const url = process.env.FRONTEND_URL || (isProduction ? '' : 'http://localhost:3000');

  if (!url && isProduction) {
    console.error('❌ FRONTEND_URL is not configured in production!');
    return 'https://dealguard.org'; // Safe fallback for production
  }

  return url;
}

interface MilestoneResponseData {
  responseType: 'ACCEPTED' | 'REJECTED' | 'AMENDMENT_PROPOSED';
  amendmentProposal?: {
    newAmount?: number;
    newDeadline?: string;
    newDescription?: string;
    reason: string;
  };
  notes?: string;
}

interface MilestoneResponseSummary {
  total: number;
  accepted: number;
  rejected: number;
  amendmentProposed: number;
  pending: number;
}

/**
 * Submit or update a party's response to a milestone
 */
export async function submitMilestoneResponse(
  milestoneId: string,
  partyId: string,
  responseData: MilestoneResponseData,
  userId: string
) {
  // 1. Validate user is member of the party
  const partyMember = await prisma.partyMember.findFirst({
    where: {
      partyId,
      userId,
    },
  });

  if (!partyMember) {
    throw new Error('You are not a member of this party');
  }

  // 2. Get milestone with deal info
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      contract: {
        include: {
          deal: {
            include: { parties: true },
          },
        },
      },
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // 3. Validate party belongs to this deal
  const partyBelongsToDeal = milestone.contract.deal.parties.some(p => p.id === partyId);
  if (!partyBelongsToDeal) {
    throw new Error('Party does not belong to this deal');
  }

  // 4. Upsert milestone party response (allow changing response)
  const response = await prisma.milestonePartyResponse.upsert({
    where: {
      milestoneId_partyId: {
        milestoneId,
        partyId,
      },
    },
    create: {
      milestoneId,
      partyId,
      responseType: responseData.responseType as MilestoneResponseType,
      amendmentProposal: responseData.amendmentProposal ? responseData.amendmentProposal as any : Prisma.JsonNull,
      notes: responseData.notes || null,
    },
    update: {
      responseType: responseData.responseType as MilestoneResponseType,
      amendmentProposal: responseData.amendmentProposal ? responseData.amendmentProposal as any : Prisma.JsonNull,
      notes: responseData.notes || null,
      respondedAt: new Date(),
    },
  });

  // 5. Create audit log
  await createAuditLog({
    dealId: milestone.contract.deal.id,
    eventType: 'MILESTONE_RESPONSE_SUBMITTED',
    actor: userId,
    entityType: 'MilestonePartyResponse',
    entityId: response.id,
    newState: {
      milestoneId,
      partyId,
      responseType: responseData.responseType,
    },
    metadata: {
      milestoneTitle: milestone.title,
      milestoneOrder: milestone.order,
      amendmentProposed: responseData.responseType === 'AMENDMENT_PROPOSED',
    },
  });

  // 6. Update milestone status based on all responses
  await updateMilestoneStatus(milestoneId);

  // 7. Send email notifications to other parties
  await sendMilestoneResponseNotifications(milestoneId, partyId, response);

  return response;
}

/**
 * Update milestone status based on all party responses (internal)
 */
async function updateMilestoneStatus(milestoneId: string): Promise<void> {
  // Get all responses for this milestone
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      partyResponses: true,
      contract: {
        include: {
          deal: {
            include: { parties: true },
          },
        },
      },
    },
  });

  if (!milestone) return;

  const responses = milestone.partyResponses;
  const totalParties = milestone.contract.deal.parties.length;

  // Determine new status based on responses
  let newStatus: MilestoneStatus;

  const hasRejection = responses.some(r => r.responseType === 'REJECTED');
  const hasAmendment = responses.some(r => r.responseType === 'AMENDMENT_PROPOSED');
  const acceptedCount = responses.filter(r => r.responseType === 'ACCEPTED').length;
  const allResponded = responses.length === totalParties;

  if (hasRejection) {
    newStatus = 'REJECTED';
  } else if (hasAmendment) {
    newStatus = 'AMENDMENT_PENDING';
  } else if (acceptedCount === totalParties && allResponded) {
    newStatus = 'APPROVED';
  } else if (allResponded) {
    newStatus = 'PENDING_RESPONSES'; // Shouldn't happen if logic is correct
  } else {
    newStatus = 'PENDING_RESPONSES';
  }

  // Update milestone status
  const oldStatus = milestone.status;
  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: newStatus },
  });

  console.log(`📊 Milestone ${milestone.order} status: ${oldStatus} → ${newStatus}`);

  // If milestone fully accepted, send celebration email
  if (newStatus === 'APPROVED' && oldStatus !== 'APPROVED') {
    await sendMilestoneAcceptedNotifications(milestoneId);
  }

  // Check if all milestones are approved → activate deal
  await checkAndActivateDeal(milestone.contract.dealId);
}

/**
 * Check if deal is fully negotiated and activate it (internal)
 */
async function checkAndActivateDeal(dealId: string): Promise<void> {
  // Get deal with parties and milestones
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

  if (!deal) return;

  // Check 1: All parties accepted invitations
  const allPartiesAccepted = deal.parties.every(p => p.invitationStatus === 'ACCEPTED');
  if (!allPartiesAccepted) {
    console.log(`⏳ Deal ${deal.dealNumber}: Waiting for all parties to accept invitations`);
    return;
  }

  // Check 2: All milestones approved
  const contract = deal.contracts[0];
  if (!contract || contract.milestones.length === 0) {
    console.log(`⏳ Deal ${deal.dealNumber}: No milestones to negotiate`);
    return;
  }

  const allMilestonesApproved = contract.milestones.every(m => m.status === 'APPROVED');
  if (!allMilestonesApproved) {
    const pendingCount = contract.milestones.filter(m => m.status !== 'APPROVED').length;
    console.log(`⏳ Deal ${deal.dealNumber}: ${pendingCount} milestones still pending`);
    return;
  }

  // All conditions met - activate deal!
  await prisma.deal.update({
    where: { id: dealId },
    data: { status: 'ACCEPTED' as DealStatus },
  });

  // Create audit log
  await createAuditLog({
    dealId,
    eventType: 'DEAL_FULLY_NEGOTIATED',
    actor: 'SYSTEM',
    entityType: 'Deal',
    entityId: dealId,
    newState: { status: 'ACCEPTED' },
    metadata: {
      reason: 'All parties agreed on all milestones',
      milestonesCount: contract.milestones.length,
    },
  });

  console.log(`✅ Deal ${deal.dealNumber} ACTIVATED - all milestones negotiated!`);

  // Send activation emails to all parties
  await sendDealFullyNegotiatedEmails(dealId);
}

/**
 * Get milestone with all party responses and summary
 */
export async function getMilestoneResponses(milestoneId: string, userId: string) {
  // Get milestone with responses
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      partyResponses: {
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
      contract: {
        include: {
          deal: {
            include: { parties: true },
          },
        },
      },
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // Calculate summary
  const totalParties = milestone.contract.deal.parties.length;
  const responses = milestone.partyResponses;

  const summary: MilestoneResponseSummary = {
    total: totalParties,
    accepted: responses.filter(r => r.responseType === 'ACCEPTED').length,
    rejected: responses.filter(r => r.responseType === 'REJECTED').length,
    amendmentProposed: responses.filter(r => r.responseType === 'AMENDMENT_PROPOSED').length,
    pending: totalParties - responses.length,
  };

  return {
    milestone,
    responses: milestone.partyResponses,
    summary,
  };
}

/**
 * Get milestone negotiation status for entire deal
 */
export async function getDealMilestoneNegotiationStatus(dealId: string, userId: string) {
  // Get deal with milestones and responses
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      parties: {
        include: {
          members: true,
        },
      },
      contracts: {
        where: { isEffective: true },
        include: {
          milestones: {
            include: {
              partyResponses: {
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
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!deal) {
    throw new Error('Deal not found');
  }

  const contract = deal.contracts[0];
  if (!contract) {
    throw new Error('No effective contract found');
  }

  const totalParties = deal.parties.length;

  // Build response data for each milestone
  const milestones = contract.milestones.map(milestone => {
    const responses = milestone.partyResponses;

    const responseSummary: MilestoneResponseSummary = {
      total: totalParties,
      accepted: responses.filter(r => r.responseType === 'ACCEPTED').length,
      rejected: responses.filter(r => r.responseType === 'REJECTED').length,
      amendmentProposed: responses.filter(r => r.responseType === 'AMENDMENT_PROPOSED').length,
      pending: totalParties - responses.length,
    };

    // Find user's response
    const userParty = deal.parties.find(p =>
      p.members?.some((m: any) => m.userId === userId)
    );
    const userResponse = userParty
      ? responses.find(r => r.partyId === userParty.id)
      : undefined;

    return {
      milestone: {
        id: milestone.id,
        order: milestone.order,
        title: milestone.title,
        description: milestone.description,
        amount: milestone.amount,
        currency: milestone.currency,
        deadline: milestone.deadline,
        status: milestone.status,
      },
      responseSummary,
      userResponse: userResponse ? {
        responseType: userResponse.responseType,
        amendmentProposal: userResponse.amendmentProposal,
        notes: userResponse.notes,
        respondedAt: userResponse.respondedAt,
      } : null,
    };
  });

  return {
    deal: {
      id: deal.id,
      dealNumber: deal.dealNumber,
      title: deal.title,
      status: deal.status,
    },
    milestones,
  };
}

/**
 * Send email notifications when party responds to milestone
 */
async function sendMilestoneResponseNotifications(
  milestoneId: string,
  respondingPartyId: string,
  response: any
): Promise<void> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      contract: {
        include: {
          deal: {
            include: { parties: true },
          },
        },
      },
    },
  });

  if (!milestone) return;

  const deal = milestone.contract.deal;
  const respondingParty = deal.parties.find(p => p.id === respondingPartyId);
  const otherParties = deal.parties.filter(p => p.id !== respondingPartyId);

  // Send to other parties
  for (const party of otherParties) {
    await emailSendingQueue.add('send-milestone-response-received', {
      to: party.contactEmail,
      subject: `Milestone Response: ${deal.dealNumber}`,
      template: 'milestone-response-received',
      variables: {
        recipientName: party.name,
        partyName: respondingParty?.name || 'A party',
        milestoneOrder: milestone.order,
        milestoneTitle: milestone.title || `Milestone ${milestone.order}`,
        dealTitle: deal.title || deal.dealNumber,
        dealNumber: deal.dealNumber,
        currency: milestone.currency,
        amount: milestone.amount?.toString() || '0',
        responseType: response.responseType,
        notes: response.notes || '',
        dealLink: `${getFrontendUrl()}/deals/${deal.id}`,
      },
      dealId: deal.id,
      priority: 5,
    });
  }

  console.log(`📧 Sent milestone response notifications for Milestone ${milestone.order}`);
}

/**
 * Send celebration emails when milestone fully accepted
 */
async function sendMilestoneAcceptedNotifications(milestoneId: string): Promise<void> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      contract: {
        include: {
          deal: {
            include: {
              parties: true,
              contracts: {
                where: { isEffective: true },
                include: { milestones: true },
              },
            },
          },
        },
      },
    },
  });

  if (!milestone) return;

  const deal = milestone.contract.deal;
  const contract = deal.contracts[0];
  const approvedCount = contract?.milestones.filter(m => m.status === 'APPROVED').length || 0;
  const totalMilestones = contract?.milestones.length || 0;
  const allMilestonesApproved = approvedCount === totalMilestones;

  // Send to all parties
  for (const party of deal.parties) {
    await emailSendingQueue.add('send-milestone-all-accepted', {
      to: party.contactEmail,
      subject: `Milestone Agreed: ${deal.dealNumber}`,
      template: 'milestone-all-accepted',
      variables: {
        partyName: party.name,
        milestoneOrder: milestone.order,
        milestoneTitle: milestone.title || `Milestone ${milestone.order}`,
        dealTitle: deal.title || deal.dealNumber,
        dealNumber: deal.dealNumber,
        currency: milestone.currency,
        amount: milestone.amount?.toString() || '0',
        allMilestonesApproved,
        remainingCount: totalMilestones - approvedCount,
        dealLink: `${getFrontendUrl()}/deals/${deal.id}`,
      },
      dealId: deal.id,
      priority: 5,
    });
  }

  console.log(`🎉 Sent milestone accepted notifications for Milestone ${milestone.order}`);
}

/**
 * Send deal fully negotiated emails
 */
async function sendDealFullyNegotiatedEmails(dealId: string): Promise<void> {
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

  const contract = deal.contracts[0];
  const milestonesCount = contract?.milestones.length || 0;

  for (const party of deal.parties) {
    await emailSendingQueue.add('send-deal-fully-negotiated', {
      to: party.contactEmail,
      subject: `Deal Activated: ${deal.dealNumber}`,
      template: 'deal-fully-negotiated',
      variables: {
        partyName: party.name,
        dealNumber: deal.dealNumber,
        dealTitle: deal.title || deal.dealNumber,
        milestonesCount,
        dealLink: `${getFrontendUrl()}/deals/${deal.id}`,
      },
      dealId: deal.id,
      priority: 5,
    });
  }

  console.log(`🎉 Sent deal fully negotiated emails for ${deal.dealNumber}`);
}
