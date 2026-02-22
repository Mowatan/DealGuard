import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authorityService } from './authority.service';
import { authenticate } from '../../middleware/auth';
import { requireSuperAdmin } from '../../middleware/authorize';
import { ApprovalType } from '@prisma/client';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const delegateAuthoritySchema = z.object({
  delegatedTo: z.string(),
  approvalTypes: z.array(z.enum([
    'DEAL_ACTIVATION',
    'MILESTONE_APPROVAL',
    'FUND_RELEASE',
    'DISPUTE_RESOLUTION',
    'CONTRACT_MODIFICATION',
    'PARTY_REMOVAL',
    'DEAL_CANCELLATION'
  ])),
  maxAmount: z.number().positive().optional(),
  requiresSeniorReview: z.boolean().optional(),
  validUntil: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  notes: z.string().optional(),
});

const updateDelegationSchema = z.object({
  approvalTypes: z.array(z.enum([
    'DEAL_ACTIVATION',
    'MILESTONE_APPROVAL',
    'FUND_RELEASE',
    'DISPUTE_RESOLUTION',
    'CONTRACT_MODIFICATION',
    'PARTY_REMOVAL',
    'DEAL_CANCELLATION'
  ])).optional(),
  maxAmount: z.number().positive().optional(),
  requiresSeniorReview: z.boolean().optional(),
  validUntil: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

const checkAuthoritySchema = z.object({
  approvalType: z.enum([
    'DEAL_ACTIVATION',
    'MILESTONE_APPROVAL',
    'FUND_RELEASE',
    'DISPUTE_RESOLUTION',
    'CONTRACT_MODIFICATION',
    'PARTY_REMOVAL',
    'DEAL_CANCELLATION'
  ]),
  amount: z.number().positive().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

export async function authorityRoutes(server: FastifyInstance) {

  // ============================================================================
  // DELEGATE AUTHORITY (Super Admin Only)
  // ============================================================================
  server.post('/api/authority/delegate', {
    preHandler: [authenticate, requireSuperAdmin]
  }, async (req, reply) => {
    try {
      const body = delegateAuthoritySchema.parse(req.body);

      const delegation = await authorityService.delegateAuthority(
        req.user!.id,
        body.delegatedTo,
        {
          approvalTypes: body.approvalTypes as ApprovalType[],
          maxAmount: body.maxAmount,
          requiresSeniorReview: body.requiresSeniorReview,
          validUntil: body.validUntil,
          notes: body.notes,
        }
      );

      return reply.code(201).send({
        success: true,
        data: delegation,
        message: 'Authority delegated successfully'
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to delegate authority');
      return reply.code(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to delegate authority'
      });
    }
  });

  // ============================================================================
  // UPDATE DELEGATION (Super Admin Only)
  // ============================================================================
  server.patch('/api/authority/delegations/:id', {
    preHandler: [authenticate, requireSuperAdmin]
  }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = updateDelegationSchema.parse(req.body);

      const delegation = await authorityService.updateDelegation(
        id,
        req.user!.id,
        {
          approvalTypes: body.approvalTypes as ApprovalType[] | undefined,
          maxAmount: body.maxAmount,
          requiresSeniorReview: body.requiresSeniorReview,
          validUntil: body.validUntil,
          isActive: body.isActive,
          notes: body.notes,
        }
      );

      return reply.send({
        success: true,
        data: delegation,
        message: 'Delegation updated successfully'
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to update delegation');
      return reply.code(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to update delegation'
      });
    }
  });

  // ============================================================================
  // REVOKE DELEGATION (Super Admin Only)
  // ============================================================================
  server.delete('/api/authority/delegations/:id', {
    preHandler: [authenticate, requireSuperAdmin]
  }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      const delegation = await authorityService.revokeDelegation(id, req.user!.id);

      return reply.send({
        success: true,
        data: delegation,
        message: 'Delegation revoked successfully'
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to revoke delegation');
      return reply.code(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to revoke delegation'
      });
    }
  });

  // ============================================================================
  // GET USER'S DELEGATIONS
  // ============================================================================
  server.get('/api/authority/my-delegations', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    try {
      const delegations = await authorityService.getUserDelegations(req.user!.id);

      return reply.send({
        success: true,
        data: delegations,
        count: delegations.length
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to get user delegations');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get delegations'
      });
    }
  });

  // ============================================================================
  // GET ALL DELEGATIONS (Super Admin Only)
  // ============================================================================
  server.get('/api/authority/delegations', {
    preHandler: [authenticate, requireSuperAdmin]
  }, async (req, reply) => {
    try {
      const delegations = await authorityService.getAllDelegations(req.user!.id);

      return reply.send({
        success: true,
        data: delegations,
        count: delegations.length
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to get all delegations');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get delegations'
      });
    }
  });

  // ============================================================================
  // GET DELEGATIONS BY ADMIN
  // ============================================================================
  server.get('/api/authority/my-created-delegations', {
    preHandler: [authenticate, requireSuperAdmin]
  }, async (req, reply) => {
    try {
      const delegations = await authorityService.getDelegationsByAdmin(req.user!.id);

      return reply.send({
        success: true,
        data: delegations,
        count: delegations.length
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to get created delegations');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get delegations'
      });
    }
  });

  // ============================================================================
  // CHECK IF USER CAN APPROVE
  // ============================================================================
  server.post('/api/authority/check', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    try {
      const body = checkAuthoritySchema.parse(req.body);

      const result = await authorityService.canUserApprove(
        req.user!.id,
        body.approvalType as ApprovalType,
        body.amount
      );

      return reply.send({
        success: true,
        data: result
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to check authority');
      return reply.code(400).send({
        error: 'Bad Request',
        message: error.message || 'Failed to check authority'
      });
    }
  });

  // ============================================================================
  // GET DELEGATION STATISTICS (Super Admin Only)
  // ============================================================================
  server.get('/api/authority/stats', {
    preHandler: [authenticate, requireSuperAdmin]
  }, async (req, reply) => {
    try {
      const stats = await authorityService.getDelegationStats(req.user!.id);

      return reply.send({
        success: true,
        data: stats
      });
    } catch (error: any) {
      req.log.error(error, 'Failed to get delegation stats');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get statistics'
      });
    }
  });

  // ============================================================================
  // GET SPECIFIC DELEGATION
  // ============================================================================
  server.get('/api/authority/delegations/:id', {
    preHandler: [authenticate]
  }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      // This would need to be implemented in the service
      // For now, we can use getAllDelegations and filter
      const delegations = await authorityService.getAllDelegations(req.user!.id);
      const delegation = delegations.find(d => d.id === id);

      if (!delegation) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Delegation not found'
        });
      }

      return reply.send({
        success: true,
        data: delegation
      });
    } catch (error: any) {
      // If user is not super admin, check if it's their delegation
      try {
        const userDelegations = await authorityService.getUserDelegations(req.user!.id);
        const { id } = req.params as { id: string };
        const delegation = userDelegations.find(d => d.id === id);

        if (!delegation) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Delegation not found'
          });
        }

        return reply.send({
          success: true,
          data: delegation
        });
      } catch (innerError: any) {
        req.log.error(innerError, 'Failed to get delegation');
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this delegation'
        });
      }
    }
  });
}
