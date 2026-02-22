import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';

/**
 * Role hierarchy (higher roles include permissions of lower roles)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  USER: 1,                      // Regular user (party in deals)
  PARTY_USER: 1,                // Legacy role - same as USER
  ESCROW_OFFICER: 2,            // Level 1: Can review, suggest, recommend
  CASE_OFFICER: 2,              // Legacy role - same level as ESCROW_OFFICER
  SENIOR_ESCROW_OFFICER: 3,     // Level 2: Can approve/reject officer recommendations
  ADMIN: 3,                     // Legacy admin role
  SUPER_ADMIN: 4,               // Level 3: Override everything, manage authority
};

/**
 * Check if a role has sufficient permissions
 */
function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Authorization middleware factory - creates middleware that checks for required roles
 *
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Middleware function
 *
 * @example
 * // Only admins and super admins can access
 * server.get('/admin/users', { preHandler: [authenticate, authorize(['ADMIN'])] }, handler);
 *
 * @example
 * // Case officers, admins, and super admins can access
 * server.post('/evidence/review', { preHandler: [authenticate, authorize(['CASE_OFFICER'])] }, handler);
 */
export function authorize(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Check if user is authenticated (should be set by authenticate middleware)
    if (!request.user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Get minimum required role from allowed roles
    const minRequiredRole = allowedRoles.reduce((min, role) => {
      return ROLE_HIERARCHY[role] < ROLE_HIERARCHY[min] ? role : min;
    }, allowedRoles[0]);

    // Check if user has sufficient permissions
    if (!hasPermission(request.user.role, minRequiredRole)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: request.user.role,
      });
    }
  };
}

/**
 * Convenience middleware for admin-only routes
 */
export const requireAdmin = authorize(['ADMIN']);

/**
 * Convenience middleware for super admin-only routes
 */
export const requireSuperAdmin = authorize(['SUPER_ADMIN']);

/**
 * Convenience middleware for case officer and above
 */
export const requireCaseOfficer = authorize(['CASE_OFFICER']);

/**
 * Convenience middleware for escrow officer and above
 */
export const requireEscrowOfficer = authorize(['ESCROW_OFFICER']);

/**
 * Convenience middleware for senior escrow officer and above
 */
export const requireSeniorEscrowOfficer = authorize(['SENIOR_ESCROW_OFFICER']);

/**
 * Check if user is authenticated (any role)
 * This is just an alias for the authenticate middleware
 */
export const requireAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.user) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }
};

// ============================================================================
// RESOURCE-BASED AUTHORIZATION (Checks access to specific deals, milestones, etc.)
// ============================================================================

import {
  canUserAccessDeal,
  canUserAccessMilestone,
  canUserAccessContract,
  canUserAccessEvidence,
  canUserAccessCustodyRecord,
  isUserPartyMember,
} from '../lib/authorization';

/**
 * Authorize access to a deal
 * User must be: creator, party member, or admin
 */
export async function authorizeDeal(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user!.id;
  const params = request.params as { dealId?: string; id?: string };
  const dealId = params.dealId || params.id;

  if (!dealId) {
    return reply.code(400).send({ error: 'Missing deal ID' });
  }

  const hasAccess = await canUserAccessDeal(dealId, userId);

  if (!hasAccess) {
    return reply.code(403).send({
      error: 'Access denied',
      message: 'You do not have permission to access this deal',
    });
  }
}

/**
 * Authorize access to a milestone
 * User must have access to the milestone's deal
 */
export async function authorizeMilestone(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user!.id;
  const params = request.params as { milestoneId?: string; id?: string };
  const milestoneId = params.milestoneId || params.id;

  if (!milestoneId) {
    return reply.code(400).send({ error: 'Missing milestone ID' });
  }

  const hasAccess = await canUserAccessMilestone(milestoneId, userId);

  if (!hasAccess) {
    return reply.code(403).send({
      error: 'Access denied',
      message: 'You do not have permission to access this milestone',
    });
  }
}

/**
 * Authorize access to a contract
 * User must have access to the contract's deal
 */
export async function authorizeContract(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user!.id;
  const params = request.params as { contractId?: string; id?: string };
  const contractId = params.contractId || params.id;

  if (!contractId) {
    return reply.code(400).send({ error: 'Missing contract ID' });
  }

  const hasAccess = await canUserAccessContract(contractId, userId);

  if (!hasAccess) {
    return reply.code(403).send({
      error: 'Access denied',
      message: 'You do not have permission to access this contract',
    });
  }
}

/**
 * Authorize access to evidence
 * User must have access to the evidence's deal
 */
export async function authorizeEvidence(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user!.id;
  const params = request.params as { evidenceId?: string; id?: string };
  const evidenceId = params.evidenceId || params.id;

  if (!evidenceId) {
    return reply.code(400).send({ error: 'Missing evidence ID' });
  }

  const hasAccess = await canUserAccessEvidence(evidenceId, userId);

  if (!hasAccess) {
    return reply.code(403).send({
      error: 'Access denied',
      message: 'You do not have permission to access this evidence',
    });
  }
}

/**
 * Authorize access to custody record
 * User must have access to the custody record's deal
 */
export async function authorizeCustody(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user!.id;
  const params = request.params as { recordId?: string; id?: string };
  const recordId = params.recordId || params.id;

  if (!recordId) {
    return reply.code(400).send({ error: 'Missing custody record ID' });
  }

  const hasAccess = await canUserAccessCustodyRecord(recordId, userId);

  if (!hasAccess) {
    return reply.code(403).send({
      error: 'Access denied',
      message: 'You do not have permission to access this custody record',
    });
  }
}

/**
 * Authorize party membership
 * User must be a member of the specified party
 */
export async function authorizePartyMembership(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user!.id;
  const body = request.body as { partyId?: string };
  const params = request.params as { partyId?: string };
  const partyId = body.partyId || params.partyId;

  if (!partyId) {
    return reply.code(400).send({ error: 'Missing party ID' });
  }

  const isMember = await isUserPartyMember(userId, partyId);

  if (!isMember) {
    return reply.code(403).send({
      error: 'Access denied',
      message: 'You are not a member of this party',
    });
  }
}
