import { FastifyInstance } from 'fastify';
import { approvalService } from './approval.service';
import { authenticate } from '../../middleware/auth';
import { requireEscrowOfficer, requireSeniorEscrowOfficer, requireSuperAdmin } from '../../middleware/authorize';
import { prisma } from '../../lib/prisma';

export async function approvalRoutes(server: FastifyInstance) {

  // Create approval request
  server.post('/api/approvals', {
    preHandler: [authenticate]
  }, async (req: any, reply) => {
    const { type, dealId, reason, details } = req.body;

    const request = await approvalService.createApprovalRequest({
      type,
      dealId,
      requestedBy: req.user.id,
      reason,
      details
    });

    return reply.send(request);
  });

  // Get approval requests for current user
  server.get('/api/approvals', {
    preHandler: [authenticate]
  }, async (req: any, reply) => {
    const approvals = await approvalService.getApprovalRequests(req.user.id);
    return reply.send(approvals);
  });

  // Get single approval request
  server.get('/api/approvals/:id', {
    preHandler: [authenticate]
  }, async (req: any, reply) => {
    const approval = await prisma.approvalRequest.findUnique({
      where: { id: req.params.id },
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

    if (!approval) {
      return reply.code(404).send({ error: 'Approval request not found' });
    }

    return reply.send(approval);
  });

  // Officer submits recommendation
  server.post('/api/approvals/:id/officer-recommendation', {
    preHandler: [authenticate, requireEscrowOfficer]
  }, async (req: any, reply) => {
    const { recommendation, notes } = req.body;

    const request = await approvalService.officerRecommendation(
      req.params.id,
      req.user.id,
      recommendation,
      notes
    );

    return reply.send(request);
  });

  // Senior officer makes decision
  server.post('/api/approvals/:id/senior-decision', {
    preHandler: [authenticate, requireSeniorEscrowOfficer]
  }, async (req: any, reply) => {
    const { decision, notes } = req.body;

    try {
      const request = await approvalService.seniorDecision(
        req.params.id,
        req.user.id,
        decision,
        notes
      );

      return reply.send(request);
    } catch (error: any) {
      if (error.message.includes('$1M limit')) {
        return reply.code(403).send({
          error: 'Authority Exceeded',
          message: error.message
        });
      }
      throw error;
    }
  });

  // Admin override
  server.post('/api/approvals/:id/admin-override', {
    preHandler: [authenticate, requireSuperAdmin]
  }, async (req: any, reply) => {
    const { decision, reason } = req.body;

    const request = await approvalService.adminOverride(
      req.params.id,
      req.user.id,
      decision,
      reason
    );

    return reply.send(request);
  });

  // Get audit log
  server.get('/api/approvals/:id/audit-log', {
    preHandler: [authenticate]
  }, async (req: any, reply) => {
    const logs = await prisma.approvalAuditLog.findMany({
      where: { approvalRequestId: req.params.id },
      include: { performer: true },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send(logs);
  });

  // Get approval statistics
  server.get('/api/approvals/stats', {
    preHandler: [authenticate, requireEscrowOfficer]
  }, async (req: any, reply) => {
    const stats = await approvalService.getApprovalStats(req.user.id);
    return reply.send(stats);
  });
}
