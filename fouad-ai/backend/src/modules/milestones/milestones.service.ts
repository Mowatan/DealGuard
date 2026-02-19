import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { emailSendingQueue } from '../../lib/queue';
import { MilestoneStatus } from '@prisma/client';
import { canUserAccessMilestone, canUserAccessContract, isAdminOrCaseOfficer, isUserPartyMember } from '../../lib/authorization';

// ============================================================================
// MILESTONE DETAILS & LISTING
// ============================================================================

export async function getMilestoneDetails(milestoneId: string, userId: string) {
  // Check if user has access to this milestone
  const hasAccess = await canUserAccessMilestone(milestoneId, userId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this milestone');
  }

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      contract: {
        include: {
          deal: {
            include: {
              parties: true,
            },
          },
        },
      },
      approvalRequirement: true,
      approvals: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          party: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
      evidenceItems: {
        where: {
          status: 'ACCEPTED',
        },
        include: {
          attachments: true,
        },
      },
      obligations: true,
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  return milestone;
}

export async function listMilestonesByContract(contractId: string, userId: string) {
  // Check if user has access to this contract
  const hasAccess = await canUserAccessContract(contractId, userId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this contract');
  }

  return prisma.milestone.findMany({
    where: { contractId },
    include: {
      approvalRequirement: true,
      approvals: {
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
      evidenceItems: {
        where: {
          status: 'ACCEPTED',
        },
        select: {
          id: true,
          subject: true,
          createdAt: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  });
}

// ============================================================================
// EVIDENCE COMPLETENESS CHECK
// ============================================================================

export async function checkEvidenceCompleteness(milestoneId: string): Promise<boolean> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      evidenceItems: {
        where: {
          status: 'ACCEPTED',
        },
      },
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // If no evidence types required, consider it complete
  if (!milestone.requiredEvidenceTypes || milestone.requiredEvidenceTypes.length === 0) {
    return true;
  }

  // Check if all required evidence types have been submitted
  const submittedTypes = new Set(
    milestone.evidenceItems.map((ev) => {
      // Extract evidence type from subject or description
      // This is simplified - in production, you'd have a more robust mapping
      return ev.subject?.toLowerCase() || '';
    })
  );

  // Check if all required types are present
  return milestone.requiredEvidenceTypes.every((requiredType) => {
    const normalizedRequired = requiredType.toLowerCase();
    return Array.from(submittedTypes).some((submitted) =>
      submitted.includes(normalizedRequired)
    );
  });
}

// ============================================================================
// MILESTONE READINESS EVALUATION
// ============================================================================

export async function evaluateMilestoneReadiness(milestoneId: string) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      contract: {
        select: { dealId: true },
      },
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // Only evaluate if milestone is IN_PROGRESS or PENDING
  if (milestone.status !== MilestoneStatus.IN_PROGRESS && milestone.status !== MilestoneStatus.PENDING) {
    return milestone;
  }

  // Check if all evidence is complete
  const isComplete = await checkEvidenceCompleteness(milestoneId);

  if (isComplete) {
    // Transition to READY_FOR_REVIEW
    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: MilestoneStatus.READY_FOR_REVIEW },
    });

    // Create audit log (skip if actor is required)
    try {
      const systemUser = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      });
      if (systemUser) {
        await createAuditLog({
          dealId: milestone.contract.dealId,
          eventType: 'MILESTONE_READY_FOR_REVIEW',
          actor: systemUser.id,
          entityType: 'Milestone',
          entityId: milestoneId,
          oldState: { status: milestone.status },
          newState: { status: MilestoneStatus.READY_FOR_REVIEW },
        });
      }
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }

    return updated;
  }

  return milestone;
}

// ============================================================================
// APPROVAL REQUIREMENTS
// ============================================================================

export async function setApprovalRequirements(
  milestoneId: string,
  requirements: {
    requireAdminApproval?: boolean;
    requireBuyerApproval?: boolean;
    requireSellerApproval?: boolean;
  },
  actorId: string
) {
  // Only case officers and admins can set approval requirements
  const isAuthorized = await isAdminOrCaseOfficer(actorId);

  if (!isAuthorized) {
    throw new Error('Unauthorized: Only case officers and admins can set approval requirements');
  }

  // Check if milestone exists
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      contract: {
        select: { dealId: true },
      },
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // Upsert approval requirement
  const approvalReq = await prisma.milestoneApprovalRequirement.upsert({
    where: { milestoneId },
    create: {
      milestoneId,
      requireAdminApproval: requirements.requireAdminApproval ?? true,
      requireBuyerApproval: requirements.requireBuyerApproval ?? false,
      requireSellerApproval: requirements.requireSellerApproval ?? false,
    },
    update: {
      requireAdminApproval: requirements.requireAdminApproval ?? true,
      requireBuyerApproval: requirements.requireBuyerApproval ?? false,
      requireSellerApproval: requirements.requireSellerApproval ?? false,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: milestone.contract.dealId,
    eventType: 'MILESTONE_APPROVAL_REQUIREMENTS_SET',
    actor: actorId,
    entityType: 'MilestoneApprovalRequirement',
    entityId: approvalReq.id,
    newState: requirements,
  });

  return approvalReq;
}

// ============================================================================
// APPROVAL SUBMISSION
// ============================================================================

export async function submitApproval(
  milestoneId: string,
  userId: string,
  partyId: string | null,
  notes?: string
) {
  // Check if user has access to this milestone
  const hasAccess = await canUserAccessMilestone(milestoneId, userId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this milestone');
  }

  // If user is claiming to represent a party, verify they are a member
  if (partyId) {
    const isMember = await isUserPartyMember(userId, partyId);

    if (!isMember) {
      throw new Error('Unauthorized: You are not a member of this party');
    }
  }

  // Check if milestone is in the right status
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      approvalRequirement: true,
      contract: {
        select: { dealId: true },
      },
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  if (milestone.status !== MilestoneStatus.READY_FOR_REVIEW) {
    throw new Error('Milestone is not ready for review');
  }

  // Check if user already approved
  const existingApproval = await prisma.milestoneApproval.findUnique({
    where: {
      milestoneId_userId: {
        milestoneId,
        userId,
      },
    },
  });

  if (existingApproval) {
    throw new Error('User has already approved this milestone');
  }

  // Create approval
  const approval = await prisma.milestoneApproval.create({
    data: {
      milestoneId,
      userId,
      partyId,
      approvalNotes: notes,
    },
    include: {
      user: true,
      party: true,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: milestone.contract.dealId,
    eventType: 'MILESTONE_APPROVAL_SUBMITTED',
    actor: userId,
    entityType: 'MilestoneApproval',
    entityId: approval.id,
    newState: {
      milestoneId,
      userId,
      partyId,
    },
    metadata: { notes },
  });

  // Check if all approvals are now complete
  await checkApprovalCompletenessAndAutoApprove(milestoneId);

  return approval;
}

// ============================================================================
// APPROVAL COMPLETENESS CHECK
// ============================================================================

export async function checkApprovalCompleteness(milestoneId: string): Promise<boolean> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      approvalRequirement: true,
      approvals: {
        include: {
          user: true,
          party: true,
        },
      },
      contract: {
        include: {
          deal: {
            include: {
              parties: true,
            },
          },
        },
      },
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // Get approval requirement (default to admin required)
  const requirement = milestone.approvalRequirement || {
    requireAdminApproval: true,
    requireBuyerApproval: false,
    requireSellerApproval: false,
  };

  // Check admin approval
  if (requirement.requireAdminApproval) {
    const hasAdminApproval = milestone.approvals.some(
      (a) => a.user.role === 'ADMIN' || a.user.role === 'SUPER_ADMIN'
    );
    if (!hasAdminApproval) {
      return false;
    }
  }

  // Check buyer approval
  if (requirement.requireBuyerApproval) {
    const buyerParty = milestone.contract.deal.parties.find((p) => p.role === 'BUYER');
    if (buyerParty) {
      const hasBuyerApproval = milestone.approvals.some((a) => a.partyId === buyerParty.id);
      if (!hasBuyerApproval) {
        return false;
      }
    }
  }

  // Check seller approval
  if (requirement.requireSellerApproval) {
    const sellerParty = milestone.contract.deal.parties.find((p) => p.role === 'SELLER');
    if (sellerParty) {
      const hasSellerApproval = milestone.approvals.some((a) => a.partyId === sellerParty.id);
      if (!hasSellerApproval) {
        return false;
      }
    }
  }

  return true;
}

async function checkApprovalCompletenessAndAutoApprove(milestoneId: string) {
  const isComplete = await checkApprovalCompleteness(milestoneId);

  if (isComplete) {
    await autoApproveMilestone(milestoneId);
  }
}

// ============================================================================
// AUTO-APPROVE MILESTONE
// ============================================================================

export async function autoApproveMilestone(milestoneId: string) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      contract: {
        include: {
          deal: {
            include: {
              parties: true,
            },
          },
        },
      },
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  if (milestone.status !== MilestoneStatus.READY_FOR_REVIEW) {
    throw new Error('Milestone is not ready for review');
  }

  // Update milestone status to APPROVED
  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: MilestoneStatus.APPROVED },
  });

  // Create audit log (skip if actor is required)
  try {
    const systemUser = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    });
    if (systemUser) {
      await createAuditLog({
        dealId: milestone.contract.deal.id,
        eventType: 'MILESTONE_APPROVED',
        actor: systemUser.id,
        entityType: 'Milestone',
        entityId: milestoneId,
        oldState: { status: milestone.status },
        newState: { status: MilestoneStatus.APPROVED },
      });
    }
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }

  // Send notification to all parties
  const partyEmails = milestone.contract.deal.parties.map(party => party.contactEmail);

  // Count total milestones and completed milestones
  const allMilestones = await prisma.milestone.findMany({
    where: { contractId: milestone.contractId },
    select: { id: true, name: true, status: true, order: true },
    orderBy: { order: 'asc' },
  });

  const completedCount = allMilestones.filter(m =>
    m.status === MilestoneStatus.APPROVED || m.id === milestoneId
  ).length;
  const totalCount = allMilestones.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);
  const isLastMilestone = completedCount === totalCount;
  const nextMilestone = allMilestones.find(m =>
    m.status !== MilestoneStatus.APPROVED && m.id !== milestoneId
  );

  const nextStepsSection = isLastMilestone
    ? '<div class="success-box"><h3>🎉 All Milestones Complete!</h3><p>This was the final milestone. The deal has successfully reached completion. All obligations have been fulfilled according to the contract terms.</p></div>'
    : `<p><strong>Next Milestone:</strong> ${nextMilestone?.name || 'None'}</p><p>Continue working towards the next milestone to keep the deal progressing.</p>`;

  for (const email of partyEmails) {
    await emailSendingQueue.add(
      'send-milestone-approved',
      {
        to: email,
        subject: `Milestone Approved: ${milestone.name} - Deal ${milestone.contract.deal.dealNumber}`,
        template: 'milestone-approved',
        variables: {
          dealNumber: milestone.contract.deal.dealNumber,
          dealTitle: milestone.contract.deal.title,
          milestoneTitle: milestone.name,
          milestoneOrder: milestone.order,
          totalMilestones: totalCount,
          completedMilestones: completedCount,
          progressPercentage: progressPercentage,
          approvedBy: 'System (Auto-approved)',
          approvedAt: new Date().toLocaleString(),
          nextStepsSection: nextStepsSection,
        },
        dealId: milestone.contract.deal.id,
        priority: 7,
      },
      { priority: 7 }
    );
  }

  return updated;
}

// ============================================================================
// LIST APPROVALS
// ============================================================================

export async function listApprovals(milestoneId: string, userId: string) {
  // Check if user has access to this milestone
  const hasAccess = await canUserAccessMilestone(milestoneId, userId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this milestone');
  }

  return prisma.milestoneApproval.findMany({
    where: { milestoneId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      party: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}
