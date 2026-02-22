import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { approvalService } from './approval.service';
import { authenticate } from '../../middleware/auth';
import { authorize, requireEscrowOfficer, requireSeniorEscrowOfficer, requireSuperAdmin } from '../../middleware/authorize';
import { ApprovalType, ApprovalStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createApprovalRequestSchema = z.object({
  type: z.enum([
    'DEAL_ACTIVATION',
    'MILESTONE_APPROVAL',
    'FUND_RELEASE',
    'DISPUTE_RESOLUTION',
    'CONTRACT_MODIFICATION',
    'PARTY_REMOVAL',
    'DEAL_CANCELLATION'
  ]),
  dealId: z.string(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  details: z.record(z.any()).optional(),
});

const officerRecommendationSchema = z.object({
  recommendation: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().min(10, 'Notes must be at least 10 characters'),
});

const seniorDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().min(10, 'Notes must be at least 10 characters'),
});

const adminOverrideSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

const getApprovalRequestsQuerySchema = z.object({
  status: z.enum([
    'PENDING',
    'OFFICER_RECOMMENDED_APPROVE',
    'OFFICER_RECOMMENDED_REJECT',
    'SENIOR_APPROVED',
    'SENIOR_REJECTED',
    'ADMIN_OVERRIDDEN',
    'WITHDRAWN'
  ]).optional(),
  type: z.enum([
    'DEAL_ACTIVATION',
    'MILESTONE_APPROVAL',
    'FUND_RELEASE',
    'DISPUTE_RESOLUTION',
    'CONTRACT_MODIFICATION',
    'PARTY_REMOVAL',
    'DEAL_CANCELLATION'
  ]).optional(),
  dealId: z.string().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

export async function approvalRoutes(server: FastifyInstance) {

  // ============================================================================
  // CREATE APPROVAL REQUEST
  // ============================================================================
  server.post('/api/approvals', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    try {
      const body = createApprovalRequestSchema.parse(req.body);

      const request = await approvalService.createApprovalRequest({
        type: body.type as ApprovalType,
        dealId: body.dealId,
        requestedBy: req.user!.id,
        reason: body.reason,
        details: body.details,
      });

      return reply.code(201).send({
        success: true,
        data: request,
        message: 'Approval request created successfully'
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to create approval request');
      return reply.code(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to create approval request'
      });
    }
  });

  // ============================================================================
  // GET ALL APPROVAL REQUESTS (filtered by role)
  // ============================================================================
  server.get('/api/approvals', {
    preHandler: [authenticate, requireEscrowOfficer]
  }, async (req, reply) => {
    try {
      const query = getApprovalRequestsQuerySchema.parse(req.query);

      const approvals = await approvalService.getApprovalRequests(
        req.user!.id,
        {
          status: query.status as ApprovalStatus | undefined,
          type: query.type as ApprovalType | undefined,
          dealId: query.dealId,
        }
      );

      return reply.send({
        success: true,
        data: approvals,
        count: approvals.length
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to get approval requests');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get approval requests'
      });
    }
  });

  // ============================================================================
  // GET SINGLE APPROVAL REQUEST
  // ============================================================================
  server.get('/api/approvals/:id', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      const approval = await approvalService.getApprovalRequest(id);

      if (!approval) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Approval request not found'
        });
      }

      // Check access permissions
      // Officers can see their assigned requests
      // Senior officers can see requests needing their review
      // Super admins can see everything
      // Requesters can see their own requests
      const user = req.user!;
      const canAccess =
        user.role === 'SUPER_ADMIN' ||
        approval.requestedBy === user.id ||
        approval.officerId === user.id ||
        (user.role === 'SENIOR_ESCROW_OFFICER' &&
         (approval.status === 'OFFICER_RECOMMENDED_APPROVE' ||
          approval.status === 'OFFICER_RECOMMENDED_REJECT'));

      if (!canAccess) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this approval request'
        });
      }

      return reply.send({
        success: true,
        data: approval
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to get approval request');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get approval request'
      });
    }
  });

  // ============================================================================
  // OFFICER SUBMITS RECOMMENDATION
  // ============================================================================
  server.post('/api/approvals/:id/officer-recommendation', {
    preHandler: [authenticate, requireEscrowOfficer]
  }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = officerRecommendationSchema.parse(req.body);

      const request = await approvalService.officerRecommendation(
        id,
        req.user!.id,
        body.recommendation,
        body.notes
      );

      return reply.send({
        success: true,
        data: request,
        message: `Recommendation submitted: ${body.recommendation}`
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to submit officer recommendation');
      return reply.code(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to submit recommendation'
      });
    }
  });

  // ============================================================================
  // SENIOR OFFICER MAKES DECISION
  // ============================================================================
  server.post('/api/approvals/:id/senior-decision', {
    preHandler: [authenticate, requireSeniorEscrowOfficer]
  }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = seniorDecisionSchema.parse(req.body);

      const request = await approvalService.seniorDecision(
        id,
        req.user!.id,
        body.decision,
        body.notes
      );

      return reply.send({
        success: true,
        data: request,
        message: `Decision made: ${body.decision}`
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to make senior decision');
      return reply.code(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to make decision'
      });
    }
  });

  // ============================================================================
  // ADMIN OVERRIDE
  // ============================================================================
  server.post('/api/approvals/:id/admin-override', {
    preHandler: [authenticate, requireSuperAdmin]
  }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = adminOverrideSchema.parse(req.body);

      const request = await approvalService.adminOverride(
        id,
        req.user!.id,
        body.decision,
        body.reason
      );

      return reply.send({
        success: true,
        data: request,
        message: `Admin override applied: ${body.decision}`
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to apply admin override');
      return reply.code(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to apply override'
      });
    }
  });

  // ============================================================================
  // WITHDRAW APPROVAL REQUEST
  // ============================================================================
  server.post('/api/approvals/:id/withdraw', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      const request = await approvalService.withdrawRequest(id, req.user!.id);

      return reply.send({
        success: true,
        data: request,
        message: 'Approval request withdrawn'
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to withdraw approval request');
      return reply.code(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to withdraw request'
      });
    }
  });

  // ============================================================================
  // GET APPROVAL AUDIT LOG
  // ============================================================================
  server.get('/api/approvals/:id/audit-log', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      const logs = await prisma.approvalAuditLog.findMany({
        where: { approvalRequestId: id },
        include: { performer: true },
        orderBy: { createdAt: 'desc' }
      });

      return reply.send({
        success: true,
        data: logs,
        count: logs.length
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to get audit log');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get audit log'
      });
    }
  });

  // ============================================================================
  // GET APPROVAL STATISTICS
  // ============================================================================
  server.get('/api/approvals/stats', {
    preHandler: [authenticate, requireEscrowOfficer]
  }, async (req, reply) => {
    try {
      const stats = await approvalService.getApprovalStats(req.user!.id);

      return reply.send({
        success: true,
        data: stats
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to get approval stats');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get approval statistics'
      });
    }
  });
}
