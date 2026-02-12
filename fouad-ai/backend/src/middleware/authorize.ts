import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';

/**
 * Role hierarchy (higher roles include permissions of lower roles)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  PARTY_USER: 1,
  CASE_OFFICER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
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
