import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { MilestoneStatus } from '@prisma/client';

// ============================================================================
// TRIGGER EVALUATION - Main Entry Point
// ============================================================================

/**
 * Evaluates if a milestone should be activated based on its trigger configuration
 * @param milestoneId - ID of milestone to evaluate
 * @returns true if milestone should be activated, false otherwise
 */
export async function evaluateTrigger(milestoneId: string): Promise<boolean> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      contract: {
        include: {
          deal: true,
          milestones: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // Already active or completed - no need to evaluate
  if (milestone.isActive || milestone.status === MilestoneStatus.COMPLETED) {
    return true;
  }

  // Evaluate based on trigger type
  switch (milestone.triggerType) {
    case 'IMMEDIATE':
      return true;

    case 'TIME_BASED':
      return await checkTimeBasedTrigger(milestone);

    case 'PERFORMANCE_BASED':
      return await checkPerformanceBasedTrigger(milestone);

    case 'KPI_BASED':
      return await checkKPIBasedTrigger(milestone);

    case 'HYBRID':
      return await checkHybridTrigger(milestone);

    default:
      console.warn(`Unknown trigger type: ${milestone.triggerType}`);
      return false;
  }
}

// ============================================================================
// TIME-BASED TRIGGER
// ============================================================================

async function checkTimeBasedTrigger(milestone: any): Promise<boolean> {
  const config = milestone.triggerConfig as any;

  // Check specific date trigger
  if (config?.specificDate) {
    const targetDate = new Date(config.specificDate);
    const now = new Date();
    return now >= targetDate;
  }

  // Check time delay trigger
  if (config?.timeDelay) {
    const { value, unit, afterMilestoneId } = config.timeDelay;

    // Determine the reference date
    let referenceDate: Date;

    if (afterMilestoneId) {
      // Find the referenced milestone's completion/activation date
      const referencedMilestone = await prisma.milestone.findUnique({
        where: { id: afterMilestoneId },
      });

      if (!referencedMilestone) {
        console.warn(`Referenced milestone ${afterMilestoneId} not found`);
        return false;
      }

      // Use completion date if available, otherwise activated date
      referenceDate =
        referencedMilestone.completedAt ||
        referencedMilestone.activatedAt ||
        referencedMilestone.createdAt;
    } else {
      // Reference is deal creation date
      const deal = await prisma.deal.findUnique({
        where: { id: milestone.contract.dealId },
      });
      referenceDate = deal?.createdAt || new Date();
    }

    // Calculate target date based on time delay
    const targetDate = calculateTargetDate(referenceDate, value, unit);
    const now = new Date();

    return now >= targetDate;
  }

  return false;
}

function calculateTargetDate(
  referenceDate: Date,
  value: number,
  unit: 'days' | 'weeks' | 'months'
): Date {
  const target = new Date(referenceDate);

  switch (unit) {
    case 'days':
      target.setDate(target.getDate() + value);
      break;
    case 'weeks':
      target.setDate(target.getDate() + value * 7);
      break;
    case 'months':
      target.setMonth(target.getMonth() + value);
      break;
  }

  return target;
}

// ============================================================================
// PERFORMANCE-BASED TRIGGER
// ============================================================================

async function checkPerformanceBasedTrigger(milestone: any): Promise<boolean> {
  const config = milestone.triggerConfig as any;

  if (!config?.dependsOnMilestoneId) {
    console.warn('Performance-based trigger missing dependsOnMilestoneId');
    return false;
  }

  const dependentMilestone = await prisma.milestone.findUnique({
    where: { id: config.dependsOnMilestoneId },
    include: {
      evidenceItems: {
        where: {
          status: 'ACCEPTED',
        },
      },
      approvals: true,
      approvalRequirement: true,
    },
  });

  if (!dependentMilestone) {
    console.warn(`Dependent milestone ${config.dependsOnMilestoneId} not found`);
    return false;
  }

  const requiredStatuses = config.requiredStatuses || [];

  // Check each required status condition
  for (const status of requiredStatuses) {
    switch (status) {
      case 'PAYMENT_RECEIVED':
        // Check if milestone has custody record with verified funding
        const custodyRecord = await prisma.custodyRecord.findFirst({
          where: {
            dealId: milestone.contract.dealId,
            status: 'FUNDING_VERIFIED',
          },
        });
        if (!custodyRecord) return false;
        break;

      case 'EVIDENCE_SUBMITTED':
        if (dependentMilestone.evidenceItems.length === 0) return false;
        break;

      case 'EVIDENCE_APPROVED':
        if (dependentMilestone.evidenceItems.length === 0) return false;
        // All evidence must be accepted
        const hasRejected = dependentMilestone.evidenceItems.some(
          (e: any) => e.status === 'REJECTED'
        );
        if (hasRejected) return false;
        break;

      case 'MILESTONE_APPROVED':
        if (dependentMilestone.status !== MilestoneStatus.APPROVED) return false;
        break;

      case 'MILESTONE_COMPLETED':
        if (dependentMilestone.status !== MilestoneStatus.COMPLETED) return false;
        break;

      default:
        console.warn(`Unknown required status: ${status}`);
        return false;
    }
  }

  // Check admin approval if required
  if (config.adminApproval) {
    const hasAdminApproval = dependentMilestone.approvals.some(
      (a: any) => a.user?.role === 'ADMIN' || a.user?.role === 'SUPER_ADMIN'
    );
    if (!hasAdminApproval) return false;
  }

  // Check all parties approval if required
  if (config.allPartiesApprove) {
    const deal = await prisma.deal.findUnique({
      where: { id: milestone.contract.dealId },
      include: { parties: true },
    });

    const allPartiesApproved = deal?.parties.every((party: any) =>
      dependentMilestone.approvals.some((a: any) => a.partyId === party.id)
    );

    if (!allPartiesApproved) return false;
  }

  return true;
}

// ============================================================================
// KPI-BASED TRIGGER
// ============================================================================

async function checkKPIBasedTrigger(milestone: any): Promise<boolean> {
  const config = milestone.triggerConfig as any;

  // KPI-based triggers require manual verification
  // This function checks if the verification has been recorded

  // For now, we check if there's a specific evidence item or approval
  // that marks the KPI as achieved

  // In a real implementation, you'd have a separate KPI verification table
  // or check for specific evidence items that validate the KPI

  // Placeholder: Check if there's admin approval indicating KPI met
  const kpiVerificationEvidence = await prisma.evidenceItem.findFirst({
    where: {
      dealId: milestone.contract.dealId,
      milestoneId: milestone.id,
      description: {
        contains: 'KPI verification',
      },
      status: 'ACCEPTED',
    },
  });

  return !!kpiVerificationEvidence;
}

// ============================================================================
// HYBRID TRIGGER (Multiple Conditions)
// ============================================================================

async function checkHybridTrigger(milestone: any): Promise<boolean> {
  const config = milestone.triggerConfig as any;
  const conditions = config?.allConditions || [];

  if (conditions.length === 0) {
    console.warn('Hybrid trigger has no conditions defined');
    return false;
  }

  // ALL conditions must be met
  for (const condition of conditions) {
    let conditionMet = false;

    switch (condition.type) {
      case 'time':
        // Create a temporary milestone object for time evaluation
        const timeMilestone = {
          ...milestone,
          triggerConfig: condition.config,
        };
        conditionMet = await checkTimeBasedTrigger(timeMilestone);
        break;

      case 'performance':
        const perfMilestone = {
          ...milestone,
          triggerConfig: condition.config,
        };
        conditionMet = await checkPerformanceBasedTrigger(perfMilestone);
        break;

      case 'custom':
        // Custom conditions require manual verification
        // Check for evidence or approval indicating condition is met
        const customEvidence = await prisma.evidenceItem.findFirst({
          where: {
            dealId: milestone.contract.dealId,
            milestoneId: milestone.id,
            description: {
              contains: condition.config.description,
            },
            status: 'ACCEPTED',
          },
        });
        conditionMet = !!customEvidence;
        break;

      default:
        console.warn(`Unknown hybrid condition type: ${condition.type}`);
        return false;
    }

    if (!conditionMet) {
      return false; // If any condition fails, entire trigger fails
    }
  }

  return true; // All conditions met
}

// ============================================================================
// AUTO-ACTIVATION
// ============================================================================

/**
 * Activates a milestone if its trigger conditions are met
 * @param milestoneId - ID of milestone to potentially activate
 */
export async function autoActivateMilestone(milestoneId: string): Promise<void> {
  const shouldActivate = await evaluateTrigger(milestoneId);

  if (!shouldActivate) {
    return;
  }

  // Activate the milestone
  const milestone = await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      isActive: true,
      activatedAt: new Date(),
      status: MilestoneStatus.IN_PROGRESS,
    },
    include: {
      contract: {
        select: {
          dealId: true,
        },
      },
    },
  });

  // Create audit log
  try {
    const systemUser = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    });

    if (systemUser) {
      await createAuditLog({
        dealId: milestone.contract.dealId,
        eventType: 'MILESTONE_AUTO_ACTIVATED',
        actor: systemUser.id,
        entityType: 'Milestone',
        entityId: milestoneId,
        newState: {
          isActive: true,
          status: MilestoneStatus.IN_PROGRESS,
        },
      });
    }
  } catch (error) {
    console.error('Failed to create audit log for milestone activation:', error);
  }
}

/**
 * Evaluates and activates all pending milestones for a deal
 * This should be called periodically (e.g., via cron job) or after milestone completions
 * @param dealId - ID of deal to check
 */
export async function autoActivateMilestonesForDeal(dealId: string): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      contracts: {
        where: { isEffective: true },
        include: {
          milestones: {
            where: {
              isActive: false,
              status: MilestoneStatus.PENDING,
            },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!deal || !deal.contracts[0]) {
    return;
  }

  const pendingMilestones = deal.contracts[0].milestones;

  for (const milestone of pendingMilestones) {
    try {
      await autoActivateMilestone(milestone.id);
    } catch (error) {
      console.error(`Failed to auto-activate milestone ${milestone.id}:`, error);
    }
  }
}

/**
 * Global function to check all deals and auto-activate eligible milestones
 * This should be called by a cron job (e.g., daily at midnight)
 */
export async function autoActivateAllMilestones(): Promise<void> {
  // Find all deals that have active contracts with pending milestones
  const deals = await prisma.deal.findMany({
    where: {
      status: {
        in: ['IN_PROGRESS', 'FUNDED', 'ACCEPTED'],
      },
      contracts: {
        some: {
          isEffective: true,
          milestones: {
            some: {
              isActive: false,
              status: MilestoneStatus.PENDING,
            },
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  console.log(`Checking ${deals.length} deals for milestone activation...`);

  for (const deal of deals) {
    try {
      await autoActivateMilestonesForDeal(deal.id);
    } catch (error) {
      console.error(`Failed to auto-activate milestones for deal ${deal.id}:`, error);
    }
  }

  console.log('Milestone auto-activation complete');
}

// ============================================================================
// TRIGGER VALIDATION
// ============================================================================

/**
 * Validates a trigger configuration before saving
 * @param triggerType - Type of trigger
 * @param triggerConfig - Configuration object
 * @returns Validation result with errors if any
 */
export function validateTriggerConfig(
  triggerType: string,
  triggerConfig: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (triggerType) {
    case 'IMMEDIATE':
      // No config needed
      break;

    case 'TIME_BASED':
      if (!triggerConfig?.timeDelay && !triggerConfig?.specificDate) {
        errors.push('Time-based trigger requires timeDelay or specificDate');
      }
      if (triggerConfig?.timeDelay) {
        if (!triggerConfig.timeDelay.value || triggerConfig.timeDelay.value <= 0) {
          errors.push('Time delay value must be greater than 0');
        }
        if (!['days', 'weeks', 'months'].includes(triggerConfig.timeDelay.unit)) {
          errors.push('Time delay unit must be days, weeks, or months');
        }
      }
      break;

    case 'PERFORMANCE_BASED':
      if (!triggerConfig?.dependsOnMilestoneId) {
        errors.push('Performance-based trigger requires dependsOnMilestoneId');
      }
      if (
        !triggerConfig?.requiredStatuses ||
        triggerConfig.requiredStatuses.length === 0
      ) {
        errors.push('Performance-based trigger requires at least one required status');
      }
      break;

    case 'KPI_BASED':
      if (!triggerConfig?.conditionDescription) {
        errors.push('KPI-based trigger requires conditionDescription');
      }
      if (!triggerConfig?.verifiedBy) {
        errors.push('KPI-based trigger requires verifiedBy');
      }
      break;

    case 'HYBRID':
      if (!triggerConfig?.allConditions || triggerConfig.allConditions.length === 0) {
        errors.push('Hybrid trigger requires at least one condition');
      }
      break;

    default:
      errors.push(`Unknown trigger type: ${triggerType}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
