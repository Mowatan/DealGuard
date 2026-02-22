import { PrismaClient, ApprovalType, ApprovalStatus, UserRole, ApprovalRequest } from '@prisma/client';
import { emailQueue } from '../email-queue/email-queue';

const prisma = new PrismaClient();

export class ApprovalService {
  /**
   * Create new approval request
   */
  async createApprovalRequest(data: {
    type: ApprovalType;
    dealId: string;
    requestedBy: string;
    reason: string;
    details?: any;
  }): Promise<ApprovalRequest> {
    // Create request
    const request = await prisma.approvalRequest.create({
      data: {
        type: data.type,
        dealId: data.dealId,
        requestedBy: data.requestedBy,
        reason: data.reason,
        details: data.details,
        status: ApprovalStatus.PENDING,
      },
      include: {
        deal: true,
        requestedByUser: true,
      }
    });

    // Auto-assign to available officer
    await this.autoAssignOfficer(request.id);

    // Log creation
    await this.logAction(request.id, data.requestedBy, 'CREATED', ApprovalStatus.PENDING);

    // Send notifications
    await this.notifyOfficers(request);

    return request;
  }

  /**
   * Officer submits recommendation
   */
  async officerRecommendation(
    requestId: string,
    officerId: string,
    recommendation: 'APPROVE' | 'REJECT',
    notes: string
  ): Promise<ApprovalRequest> {
    // Verify officer has authority
    await this.verifyRole(officerId, [UserRole.ESCROW_OFFICER, UserRole.SENIOR_ESCROW_OFFICER, UserRole.SUPER_ADMIN]);

    const newStatus = recommendation === 'APPROVE'
      ? ApprovalStatus.OFFICER_RECOMMENDED_APPROVE
      : ApprovalStatus.OFFICER_RECOMMENDED_REJECT;

    const request = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        officerId,
        officerRecommendation: recommendation,
        officerNotes: notes,
        officerReviewedAt: new Date(),
        status: newStatus,
      },
      include: {
        deal: true,
        officer: true,
        requestedByUser: true,
      }
    });

    // Log action
    await this.logAction(requestId, officerId, 'REVIEWED', newStatus);

    // Escalate to senior officer
    await this.escalateToSenior(request);

    return request;
  }

  /**
   * Senior officer makes final decision
   */
  async seniorDecision(
    requestId: string,
    seniorId: string,
    decision: 'APPROVE' | 'REJECT',
    notes: string
  ): Promise<ApprovalRequest> {
    // Verify senior authority
    await this.verifyRole(seniorId, [UserRole.SENIOR_ESCROW_OFFICER, UserRole.SUPER_ADMIN]);

    const newStatus = decision === 'APPROVE'
      ? ApprovalStatus.SENIOR_APPROVED
      : ApprovalStatus.SENIOR_REJECTED;

    const request = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        seniorOfficerId: seniorId,
        seniorDecision: decision,
        seniorNotes: notes,
        seniorReviewedAt: new Date(),
        status: newStatus,
        finalDecision: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        completedAt: new Date(),
      },
      include: {
        deal: true,
        officer: true,
        seniorOfficer: true,
        requestedByUser: true,
      }
    });

    // Log action
    await this.logAction(requestId, seniorId, 'DECIDED', newStatus);

    // Execute approved action
    if (decision === 'APPROVE') {
      await this.executeApproval(request);
    }

    // Notify all parties
    await this.notifyDecision(request);

    return request;
  }

  /**
   * Super admin override
   */
  async adminOverride(
    requestId: string,
    adminId: string,
    decision: 'APPROVE' | 'REJECT',
    reason: string
  ): Promise<ApprovalRequest> {
    // Verify super admin
    await this.verifyRole(adminId, [UserRole.SUPER_ADMIN]);

    const request = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        adminOverrideBy: adminId,
        adminOverrideReason: reason,
        adminOverriddenAt: new Date(),
        status: ApprovalStatus.ADMIN_OVERRIDDEN,
        finalDecision: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        completedAt: new Date(),
      },
      include: {
        deal: true,
        officer: true,
        seniorOfficer: true,
        adminOverrideUser: true,
        requestedByUser: true,
      }
    });

    // Log override
    await this.logAction(requestId, adminId, 'OVERRIDDEN', ApprovalStatus.ADMIN_OVERRIDDEN);

    // Execute if approved
    if (decision === 'APPROVE') {
      await this.executeApproval(request);
    }

    // Notify everyone
    await this.notifyOverride(request);

    return request;
  }

  /**
   * Withdraw an approval request
   */
  async withdrawRequest(requestId: string, userId: string): Promise<ApprovalRequest> {
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { requestedByUser: true }
    });

    if (!request) {
      throw new Error('Approval request not found');
    }

    // Only requester or admin can withdraw
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (request.requestedBy !== userId && user?.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Only the requester or super admin can withdraw this request');
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.WITHDRAWN,
        finalDecision: 'WITHDRAWN',
        completedAt: new Date(),
      },
      include: {
        deal: true,
        requestedByUser: true,
      }
    });

    await this.logAction(requestId, userId, 'WITHDRAWN', ApprovalStatus.WITHDRAWN);

    return updated;
  }

  /**
   * Get approval request with full audit trail
   */
  async getApprovalRequest(requestId: string) {
    return await prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: {
        deal: true,
        requestedByUser: true,
        officer: true,
        seniorOfficer: true,
        adminOverrideUser: true,
        auditLogs: {
          include: { performer: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * Get all approval requests (filtered by role)
   */
  async getApprovalRequests(userId: string, filters?: {
    status?: ApprovalStatus;
    type?: ApprovalType;
    dealId?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const where: any = { ...filters };

    // Filter based on role
    if (user.role === UserRole.ESCROW_OFFICER) {
      // Officers only see their assigned requests
      where.officerId = userId;
    } else if (user.role === UserRole.SENIOR_ESCROW_OFFICER) {
      // Senior officers see requests that need their review
      where.status = {
        in: [ApprovalStatus.OFFICER_RECOMMENDED_APPROVE, ApprovalStatus.OFFICER_RECOMMENDED_REJECT]
      };
    }
    // Super admins see everything (no additional filter)

    return await prisma.approvalRequest.findMany({
      where,
      include: {
        deal: true,
        requestedByUser: true,
        officer: true,
        seniorOfficer: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const baseWhere: any = {};
    if (user.role === UserRole.ESCROW_OFFICER) {
      baseWhere.officerId = userId;
    }

    const [pending, approvedToday, rejected, overridden] = await Promise.all([
      prisma.approvalRequest.count({
        where: { ...baseWhere, status: ApprovalStatus.PENDING }
      }),
      prisma.approvalRequest.count({
        where: {
          ...baseWhere,
          status: ApprovalStatus.SENIOR_APPROVED,
          completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      }),
      prisma.approvalRequest.count({
        where: { ...baseWhere, status: ApprovalStatus.SENIOR_REJECTED }
      }),
      prisma.approvalRequest.count({
        where: { ...baseWhere, status: ApprovalStatus.ADMIN_OVERRIDDEN }
      })
    ]);

    return { pending, approvedToday, rejected, overridden };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Auto-assign to available officer
   */
  private async autoAssignOfficer(requestId: string): Promise<void> {
    // Find least busy officer (simple round-robin for now)
    const officer = await prisma.user.findFirst({
      where: {
        role: UserRole.ESCROW_OFFICER,
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (officer) {
      await prisma.approvalRequest.update({
        where: { id: requestId },
        data: { officerId: officer.id }
      });

      await this.logAction(requestId, officer.id, 'ASSIGNED', ApprovalStatus.PENDING);
    }
  }

  /**
   * Escalate to senior officer
   */
  private async escalateToSenior(request: any): Promise<void> {
    // Find available senior officer
    const senior = await prisma.user.findFirst({
      where: {
        role: { in: [UserRole.SENIOR_ESCROW_OFFICER, UserRole.SUPER_ADMIN] }
      }
    });

    if (senior) {
      // Queue email notification to senior officer
      await emailQueue.addEmail({
        to: senior.email,
        subject: `Approval Escalated: ${request.deal.title}`,
        template: 'approval-escalated-to-senior',
        data: {
          seniorName: senior.name,
          dealTitle: request.deal.title,
          approvalType: request.type,
          officerRecommendation: request.officerRecommendation,
          officerNotes: request.officerNotes,
          requestId: request.id,
          dashboardUrl: `${process.env.FRONTEND_URL}/escrow-dashboard`
        }
      });
    }
  }

  /**
   * Execute approved action
   */
  private async executeApproval(request: any): Promise<void> {
    switch (request.type) {
      case ApprovalType.DEAL_ACTIVATION:
        await prisma.deal.update({
          where: { id: request.dealId },
          data: { status: 'IN_PROGRESS' }
        });
        break;

      case ApprovalType.MILESTONE_APPROVAL:
        // Extract milestone ID from details
        if (request.details?.milestoneId) {
          await prisma.milestone.update({
            where: { id: request.details.milestoneId },
            data: { status: 'APPROVED' }
          });
        }
        break;

      case ApprovalType.FUND_RELEASE:
        // Execute fund release logic
        if (request.details?.custodyRecordId) {
          await prisma.custodyRecord.update({
            where: { id: request.details.custodyRecordId },
            data: {
              status: 'RELEASE_AUTHORIZED',
              authorizedAt: new Date(),
              authorizedBy: request.seniorOfficerId || request.adminOverrideBy,
            }
          });
        }
        break;

      case ApprovalType.DISPUTE_RESOLUTION:
        if (request.details?.disputeId) {
          await prisma.dispute.update({
            where: { id: request.details.disputeId },
            data: {
              status: 'RESOLVED',
              resolvedAt: new Date(),
              resolvedBy: request.seniorOfficerId || request.adminOverrideBy,
              finalResolution: request.details.resolution,
            }
          });
        }
        break;

      case ApprovalType.DEAL_CANCELLATION:
        await prisma.deal.update({
          where: { id: request.dealId },
          data: { status: 'CANCELLED', closedAt: new Date() }
        });
        break;

      // Add other approval type executions as needed
    }
  }

  /**
   * Verify user has required role
   */
  private async verifyRole(userId: string, allowedRoles: UserRole[]): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !allowedRoles.includes(user.role)) {
      throw new Error('Insufficient permissions');
    }
  }

  /**
   * Log approval action to audit trail
   */
  private async logAction(
    requestId: string,
    userId: string,
    action: string,
    newStatus: ApprovalStatus,
    previousStatus?: ApprovalStatus
  ): Promise<void> {
    await prisma.approvalAuditLog.create({
      data: {
        approvalRequestId: requestId,
        performedBy: userId,
        action,
        newStatus,
        previousStatus,
      }
    });
  }

  /**
   * Notify officers about new approval request
   */
  private async notifyOfficers(request: any): Promise<void> {
    // Find all escrow officers
    const officers = await prisma.user.findMany({
      where: { role: UserRole.ESCROW_OFFICER }
    });

    // Queue notification emails
    for (const officer of officers) {
      await emailQueue.addEmail({
        to: officer.email,
        subject: `New Approval Request: ${request.deal.title}`,
        template: 'approval-officer-assigned',
        data: {
          officerName: officer.name,
          dealTitle: request.deal.title,
          approvalType: request.type,
          reason: request.reason,
          requestId: request.id,
          dashboardUrl: `${process.env.FRONTEND_URL}/escrow-dashboard`
        }
      });
    }
  }

  /**
   * Notify all parties of final decision
   */
  private async notifyDecision(request: any): Promise<void> {
    const decisionMaker = request.seniorOfficer;

    await emailQueue.addEmail({
      to: request.requestedByUser.email,
      subject: `Approval ${request.finalDecision}: ${request.deal.title}`,
      template: 'approval-decision-made',
      data: {
        userName: request.requestedByUser.name,
        dealTitle: request.deal.title,
        approvalType: request.type,
        decision: request.finalDecision,
        decisionMaker: decisionMaker?.name || 'Senior Officer',
        notes: request.seniorNotes,
        requestId: request.id,
      }
    });
  }

  /**
   * Notify about admin override
   */
  private async notifyOverride(request: any): Promise<void> {
    const admin = request.adminOverrideUser;

    // Notify requester
    await emailQueue.addEmail({
      to: request.requestedByUser.email,
      subject: `Admin Override: ${request.deal.title}`,
      template: 'approval-admin-override',
      data: {
        userName: request.requestedByUser.name,
        dealTitle: request.deal.title,
        approvalType: request.type,
        decision: request.finalDecision,
        adminName: admin?.name || 'Super Admin',
        reason: request.adminOverrideReason,
        requestId: request.id,
      }
    });

    // Also notify officer and senior if they were involved
    if (request.officer) {
      await emailQueue.addEmail({
        to: request.officer.email,
        subject: `Admin Override: ${request.deal.title}`,
        template: 'approval-admin-override',
        data: {
          userName: request.officer.name,
          dealTitle: request.deal.title,
          approvalType: request.type,
          decision: request.finalDecision,
          adminName: admin?.name || 'Super Admin',
          reason: request.adminOverrideReason,
          requestId: request.id,
        }
      });
    }
  }
}

export const approvalService = new ApprovalService();
