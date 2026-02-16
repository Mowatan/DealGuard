import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { verifyToken as verifyClerkToken } from '@clerk/backend';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

// Extend Fastify request to include user data
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      clerkId: string | null;
    };
  }
}

/**
 * Extract token from Authorization header
 */
function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return null;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Check if request originates from localhost
 */
function isLocalhost(request: FastifyRequest): boolean {
  const ip = request.ip;
  const hostname = request.hostname;

  // Check for IPv4 localhost
  if (ip === '127.0.0.1' || ip === 'localhost') {
    return true;
  }

  // Check for IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return true;
  }

  // Check hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }

  return false;
}

/**
 * Check if test auth override should be enabled
 *
 * SECURITY: This override is ONLY enabled when ALL conditions are met:
 * 1. NODE_ENV is NOT "production"
 * 2. ENABLE_CONTRACT_TEST_AUTH is explicitly set to "true"
 * 3. Request originates from localhost
 * 4. No Authorization header is present
 * 5. Test secret matches CONTRACT_TEST_SECRET (constant-time comparison)
 *
 * This makes it cryptographically and operationally impossible to exploit
 * in any real production deployment.
 */
function canUseTestAuthOverride(request: FastifyRequest): boolean {
  // HARD REQUIREMENT 1: Must NOT be production
  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  // HARD REQUIREMENT 2: Must explicitly enable test auth
  if (process.env.ENABLE_CONTRACT_TEST_AUTH !== 'true') {
    return false;
  }

  // HARD REQUIREMENT 3: Must be from localhost
  if (!isLocalhost(request)) {
    return false;
  }

  // HARD REQUIREMENT 4: No Authorization header present
  // Override must not apply if normal auth is attempted
  if (request.headers.authorization) {
    return false;
  }

  return true;
}

/**
 * Authentication middleware - verifies Clerk JWT and attaches user to request
 *
 * PRODUCTION-SAFE TEST MODE:
 * In non-production environments with ENABLE_CONTRACT_TEST_AUTH=true,
 * supports test auth via x-test-user-id + x-test-secret headers from localhost.
 * This allows deterministic RBAC testing without requiring real Clerk tokens.
 *
 * SECURITY HARDENING:
 * - Disabled in production (NODE_ENV=production)
 * - Requires explicit opt-in (ENABLE_CONTRACT_TEST_AUTH=true)
 * - Restricted to localhost only (127.0.0.1, ::1)
 * - Requires constant-time validated secret
 * - Cannot override if Authorization header present
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // TEST AUTH OVERRIDE (production-hardened)
    // Only attempt if all security conditions are met
    if (canUseTestAuthOverride(request)) {
      const testUserId = request.headers['x-test-user-id'] as string;
      const testSecret = request.headers['x-test-secret'] as string;
      const expectedSecret = process.env.CONTRACT_TEST_SECRET;

      // Check if override headers are present and valid
      if (testUserId && testSecret && expectedSecret) {
        // Use constant-time comparison to prevent timing attacks
        if (constantTimeCompare(testSecret, expectedSecret)) {
          // Fetch test user from database
          const user = await prisma.user.findUnique({
            where: { id: testUserId },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              clerkId: true,
            },
          });

          if (user) {
            // Emit warning log (test mode only)
            request.log.warn(
              `TEST AUTH OVERRIDE ACTIVE for user=${user.id}, role=${user.role}, email=${user.email}`
            );

            request.user = user;
            return; // Skip Clerk verification in test mode
          }
        }
      }
    }

    // STANDARD CLERK AUTHENTICATION FLOW
    // Extract token from Authorization header
    const token = extractTokenFromHeader(request.headers.authorization);

    if (!token) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
    }

    // Verify Clerk token
    let clerkPayload;
    try {
      // Validate that Clerk keys are configured
      if (!process.env.CLERK_SECRET_KEY) {
        request.log.error('CLERK_SECRET_KEY not configured');
        return reply.code(500).send({
          error: 'Configuration Error',
          message: 'Authentication service not configured',
        });
      }

      // Log Clerk configuration (without exposing full key)
      request.log.debug({
        hasSecretKey: !!process.env.CLERK_SECRET_KEY,
        secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 10),
      }, 'Verifying Clerk token');

      clerkPayload = await verifyClerkToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        // Adding publishableKey can help with JWK resolution
        ...(process.env.CLERK_PUBLISHABLE_KEY && {
          publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
        }),
      });
    } catch (error) {
      // Enhanced error logging for debugging JWK issues
      const errorMessage = error instanceof Error ? error.message : 'Invalid token';
      const errorName = error instanceof Error ? error.name : 'Unknown';

      request.log.warn({
        error: errorMessage,
        errorName,
        tokenPrefix: token.substring(0, 20) + '...',
      }, 'Clerk token verification failed');

      return reply.code(401).send({
        error: 'Unauthorized',
        message: errorMessage.includes('JWK')
          ? 'Token verification failed. Please sign in again.'
          : errorMessage,
      });
    }

    // Get Clerk user ID
    const clerkId = clerkPayload.sub;

    // Fetch or create user in our database
    let user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        clerkId: true,
      },
    });

    // If user doesn't exist in our DB, create them
    if (!user) {
      // Get email from Clerk token claims
      const email = (clerkPayload as any).email || `${clerkId}@clerk.user`;
      const name = (clerkPayload as any).name || (clerkPayload as any).email?.split('@')[0] || 'User';

      user = await prisma.user.create({
        data: {
          clerkId,
          email,
          name,
          passwordHash: '', // Not used with Clerk
          role: 'PARTY_USER', // Default role
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          clerkId: true,
        },
      });
    }

    // Attach user to request
    request.user = user;
  } catch (error) {
    request.log.error(error, 'Authentication error');
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}
