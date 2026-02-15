import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { emailSendingQueue } from '../../lib/queue';
import { getStagesForDeal } from './stage-templates';
import { ProgressStageStatus } from '@prisma/client';

/**
 * Initialize progress tracker for a new deal
 * Creates progress events for all stages based on transaction type and service tier
 */
export async function initializeProgressTracker(dealId: string, userId: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { progressEvents: true }
  });

  if (!deal) {
    throw new Error('Deal not found');
  }

  // Skip if already initialized
  if (deal.progressEvents.length > 0) {
    return deal.progressEvents;
  }

  // Get stage templates for this deal
  const stages = getStagesForDeal(deal.transactionType, deal.serviceTier);

  if (stages.length === 0) {
    console.warn(`No stages defined for transaction type ${deal.transactionType} and service tier ${deal.serviceTier}`);
    return [];
  }

  // Create progress events for all stages
  const progressEvents = await Promise.all(
    stages.map((stage) =>
      prisma.dealProgressEvent.create({
        data: {
          dealId,
          stageKey: stage.key,
          stageName: stage.name,
          stageOrder: stage.order,
          status: stage.order === 1 ? ProgressStageStatus.IN_PROGRESS : ProgressStageStatus.PENDING,
          enteredAt: stage.order === 1 ? new Date() : null,
          metadata: {
            description: stage.description,
            actorType: stage.actorType,
            estimatedDuration: stage.estimatedDuration,
            icon: stage.icon
          }
        }
      })
    )
  );

  // Create audit log
  await createAuditLog({
    dealId,
    eventType: 'PROGRESS_TRACKER_INITIALIZED',
    actor: userId,
    entityType: 'DealProgressEvent',
    entityId: dealId,
    newState: { stageCount: progressEvents.length }
  });

  return progressEvents;
}

/**
 * Advance to next stage
 * Marks current stage as completed and activates next stage
 */
export async function advanceStage(
  dealId: string,
  currentStageKey: string,
  completedBy: string,
  notes?: string
) {
  // Mark current stage as completed
  const currentStage = await prisma.dealProgressEvent.update({
    where: { dealId_stageKey: { dealId, stageKey: currentStageKey } },
    data: {
      status: ProgressStageStatus.COMPLETED,
      completedAt: new Date(),
      completedBy,
      notes
    }
  });

  // Find next stage
  const nextStage = await prisma.dealProgressEvent.findFirst({
    where: {
      dealId,
      stageOrder: { gt: currentStage.stageOrder },
      status: ProgressStageStatus.PENDING
    },
    orderBy: { stageOrder: 'asc' }
  });

  if (nextStage) {
    // Activate next stage
    await prisma.dealProgressEvent.update({
      where: { id: nextStage.id },
      data: {
        status: ProgressStageStatus.IN_PROGRESS,
        enteredAt: new Date()
      }
    });

    // Send notification for next stage
    await sendStageNotification(dealId, nextStage.stageKey);
  }

  // Create audit log
  await createAuditLog({
    dealId,
    eventType: 'PROGRESS_STAGE_ADVANCED',
    actor: completedBy,
    entityType: 'DealProgressEvent',
    entityId: currentStage.id,
    oldState: { stage: currentStageKey, status: 'IN_PROGRESS' },
    newState: { stage: nextStage?.stageKey || 'NONE', status: 'COMPLETED' }
  });

  return { currentStage, nextStage };
}

/**
 * Get progress status for a deal
 * Returns all stages, current stage, and completion percentage
 */
export async function getProgressStatus(dealId: string) {
  const events = await prisma.dealProgressEvent.findMany({
    where: { dealId },
    orderBy: { stageOrder: 'asc' }
  });

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      escrowAssignment: {
        include: {
          escrowOfficer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  const total = events.length;
  const completed = events.filter(e => e.status === ProgressStageStatus.COMPLETED).length;
  const current = events.find(e => e.status === ProgressStageStatus.IN_PROGRESS);

  return {
    stages: events,
    progress: {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      currentStage: current
    },
    escrowOfficer: deal?.escrowAssignment ? {
      id: deal.escrowAssignment.escrowOfficer.id,
      name: deal.escrowAssignment.escrowOfficer.name,
      email: deal.escrowAssignment.escrowOfficer.email,
      currentMessage: deal.escrowAssignment.currentMessage,
      lastUpdatedAt: deal.escrowAssignment.lastUpdatedAt
    } : null
  };
}

/**
 * Update stage status without advancing
 * Useful for marking stages as blocked or skipped
 */
export async function updateStageStatus(
  dealId: string,
  stageKey: string,
  status: ProgressStageStatus,
  notes?: string,
  updatedBy?: string
) {
  const stage = await prisma.dealProgressEvent.update({
    where: { dealId_stageKey: { dealId, stageKey } },
    data: {
      status,
      notes,
      ...(status === ProgressStageStatus.COMPLETED && { completedAt: new Date(), completedBy: updatedBy }),
      ...(status === ProgressStageStatus.IN_PROGRESS && { enteredAt: new Date() })
    }
  });

  await createAuditLog({
    dealId,
    eventType: 'PROGRESS_STAGE_UPDATED',
    actor: updatedBy || 'system',
    entityType: 'DealProgressEvent',
    entityId: stage.id,
    newState: { stageKey, status, notes }
  });

  return stage;
}

/**
 * Send notification when a new stage becomes active
 */
async function sendStageNotification(dealId: string, stageKey: string) {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        parties: true,
        escrowAssignment: { include: { escrowOfficer: true } }
      }
    });

    if (!deal) return;

    const stage = await prisma.dealProgressEvent.findUnique({
      where: { dealId_stageKey: { dealId, stageKey } }
    });

    if (!stage) return;

    const metadata = stage.metadata as any;
    let recipients: string[] = [];

    // Determine recipients based on actor type
    if (metadata.actorType === 'PARTY') {
      recipients = deal.parties.map(p => p.contactEmail);
    } else if (metadata.actorType === 'ESCROW_OFFICER' && deal.escrowAssignment) {
      recipients = [deal.escrowAssignment.escrowOfficer.email];
    } else if (metadata.actorType === 'ADMIN') {
      // Get admin emails
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        select: { email: true }
      });
      recipients = admins.map(a => a.email);
    }

    // Send email notification to each recipient
    for (const email of recipients) {
      await emailSendingQueue.add(
        'send-progress-stage-notification',
        {
          to: email,
          subject: `Action Required: ${stage.stageName} - Deal ${deal.dealNumber}`,
          template: 'progress-stage-notification',
          variables: {
            dealNumber: deal.dealNumber,
            dealTitle: deal.title,
            stageName: stage.stageName,
            stageDescription: metadata.description,
            estimatedDuration: metadata.estimatedDuration || 'N/A',
            actorType: metadata.actorType
          },
          dealId,
          priority: 7
        },
        { priority: 7 }
      );
    }
  } catch (error) {
    console.error('Failed to send stage notification:', error);
    // Don't throw - notification failure shouldn't block progress
  }
}

/**
 * Get all deals currently in a specific stage
 */
export async function getDealsInStage(stageKey: string) {
  const events = await prisma.dealProgressEvent.findMany({
    where: {
      stageKey,
      status: ProgressStageStatus.IN_PROGRESS
    },
    include: {
      deal: {
        include: {
          parties: true,
          escrowAssignment: true
        }
      }
    }
  });

  return events.map(e => e.deal);
}

/**
 * Calculate estimated completion date for a deal
 */
function calculateEstimatedCompletion(events: any[]): Date {
  const remainingStages = events.filter(
    e => e.status === ProgressStageStatus.PENDING || e.status === ProgressStageStatus.IN_PROGRESS
  );

  // Simple estimation: 2 days per remaining stage (can be refined with ML)
  const daysRemaining = remainingStages.length * 2;
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);

  return estimatedDate;
}
