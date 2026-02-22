import { PrismaClient, ApprovalType, ApprovalStatus, UserRole } from '@prisma/client';
import { emailSendingQueue } from '../../lib/queue';

const prisma = new PrismaClient();

export class ApprovalService {
  async createApprovalRequest(data: {
    type: ApprovalType;
    dealId: string;
    requestedBy: string;
    reason: string;
    details?: any;
  }) {
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

    await this.autoAssignOfficer(request.id);
    await this.logAction(request.id, data.requestedBy, 'CREATED', ApprovalStatus.PENDING);
    await this.notifyOfficers(request);

    return request;
  }

  async officerRecommendation(
    requestId: string,
    officerId: string,
    recommendation: 'APPROVE' | 'REJECT',
    notes: string
  ) {
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

    await this.logAction(requestId, officerId, 'REVIEWED', newStatus);
    await this.escalateToSenior(request);

    return request;
  }

  async seniorDecision(
    requestId: string,
    seniorId: string,
    decision: 'APPROVE' | 'REJECT',
    notes: string
  ) {
    await this.verifyRole(seniorId, [UserRole.SENIOR_ESCROW_OFFICER, UserRole.SUPER_ADMIN]);

    // Get request with deal to check $1M limit
    const existingRequest = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { deal: true }
    });

    if (!existingRequest) {
      throw new Error('Approval request not found');
    }

    // Check $1M limit for Senior Escrow Officers (Level 2)
    const user = await prisma.user.findUnique({ where: { id: seniorId } });
    if (user?.role === UserRole.SENIOR_ESCROW_OFFICER && decision === 'APPROVE') {
      const dealAmount = existingRequest.deal.totalAmount?.toNumber() || 0;
      if (dealAmount > 1000000) {
        throw new Error('Deal amount exceeds senior officer authority ($1M limit). Requires super admin approval.');
      }
    }

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

    await this.logAction(requestId, seniorId, 'DECIDED', newStatus);

    if (decision === 'APPROVE') {
      await this.executeApproval(request);
    }

    await this.notifyDecision(request);

    return request;
  }

  async adminOverride(
    requestId: string,
    adminId: string,
    decision: 'APPROVE' | 'REJECT',
    reason: string
  ) {
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

    await this.logAction(requestId, adminId, 'OVERRIDDEN', ApprovalStatus.ADMIN_OVERRIDDEN);

    if (decision === 'APPROVE') {
      await this.executeApproval(request);
    }

    await this.notifyOverride(request);

    return request;
  }

  async withdrawRequest(requestId: string, userId: string) {
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { requestedByUser: true }
    });

    if (!request) {
      throw new Error('Approval request not found');
    }

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

  async getApprovalRequests(userId: string, filters?: {
    status?: ApprovalStatus;
    type?: ApprovalType;
    dealId?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const where: any = { ...filters };

    if (user.role === UserRole.ESCROW_OFFICER) {
      where.officerId = userId;
    } else if (user.role === UserRole.SENIOR_ESCROW_OFFICER) {
      where.status = {
        in: [ApprovalStatus.OFFICER_RECOMMENDED_APPROVE, ApprovalStatus.OFFICER_RECOMMENDED_REJECT]
      };
    }

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

  private async autoAssignOfficer(requestId: string): Promise<void> {
    const officer = await prisma.user.findFirst({
      where: { role: UserRole.ESCROW_OFFICER },
      orderBy: { createdAt: 'asc' }
    });

    if (officer) {
      await prisma.approvalRequest.update({
        where: { id: requestId },
        data: { officerId: officer.id }
      });

      await this.logAction(requestId, officer.id, 'ASSIGNED', ApprovalStatus.PENDING);
    }
  }

  private async escalateToSenior(request: any): Promise<void> {
    const senior = await prisma.user.findFirst({
      where: {
        role: { in: [UserRole.SENIOR_ESCROW_OFFICER, UserRole.SUPER_ADMIN] }
      }
    });

    if (senior) {
      await emailSendingQueue.add('send-email', {
        to: senior.email,
        subject: `Approval Escalated: ${request.deal.title}`,
        template: 'approval-escalated-to-senior',
        variables: {
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

  private async executeApproval(request: any): Promise<void> {
    switch (request.type) {
      case ApprovalType.DEAL_ACTIVATION:
        await prisma.deal.update({
          where: { id: request.dealId },
          data: { status: 'IN_PROGRESS' }
        });
        break;

      case ApprovalType.MILESTONE_APPROVAL:
        if (request.details?.milestoneId) {
          await prisma.milestone.update({
            where: { id: request.details.milestoneId },
            data: { status: 'APPROVED' }
          });
        }
        break;

      case ApprovalType.FUND_RELEASE:
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
    }
  }

  private async verifyRole(userId: string, allowedRoles: UserRole[]): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !allowedRoles.includes(user.role)) {
      throw new Error('Insufficient permissions');
    }
  }

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

  private async notifyOfficers(request: any): Promise<void> {
    const officers = await prisma.user.findMany({
      where: { role: UserRole.ESCROW_OFFICER }
    });

    for (const officer of officers) {
      await emailSendingQueue.add('send-email', {
        to: officer.email,
        subject: `New Approval Request: ${request.deal.title}`,
        template: 'approval-officer-assigned',
        variables: {
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

  private async notifyDecision(request: any): Promise<void> {
    const decisionMaker = request.seniorOfficer;

    await emailSendingQueue.add('send-email', {
      to: request.requestedByUser.email,
      subject: `Approval ${request.finalDecision}: ${request.deal.title}`,
      template: 'approval-decision-made',
      variables: {
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

  private async notifyOverride(request: any): Promise<void> {
    const admin = request.adminOverrideUser;

    await emailSendingQueue.add('send-email', {
      to: request.requestedByUser.email,
      subject: `Admin Override: ${request.deal.title}`,
      template: 'approval-admin-override',
      variables: {
        userName: request.requestedByUser.name,
        dealTitle: request.deal.title,
        approvalType: request.type,
        decision: request.finalDecision,
        adminName: admin?.name || 'Super Admin',
        reason: request.adminOverrideReason,
        requestId: request.id,
      }
    });

    if (request.officer) {
      await emailSendingQueue.add('send-email', {
        to: request.officer.email,
        subject: `Admin Override: ${request.deal.title}`,
        template: 'approval-admin-override',
        variables: {
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
