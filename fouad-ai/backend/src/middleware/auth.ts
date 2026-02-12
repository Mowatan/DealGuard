import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { verifyToken as verifyClerkToken } from '@clerk/backend';
import { prisma } from '../lib/prisma';

// Extend Fastify request to include user data
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      clerkId: string;
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
 * Authentication middleware - verifies Clerk JWT and attaches user to request
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
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
      clerkPayload = await verifyClerkToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    } catch (error) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: error instanceof Error ? error.message : 'Invalid token',
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
