import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';

/**
 * Custom Application Error
 * Use this for controlled, expected errors
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Convenience error factories
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      404,
      id ? `${resource} with ID '${id}' not found` : `${resource} not found`,
      'NOT_FOUND'
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(409, message, 'CONFLICT', details);
  }
}

/**
 * Centralized error handler for all routes
 * Automatically handles AppError, Prisma errors, validation errors, and unexpected errors
 */
export async function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log error for debugging (in production, send to monitoring service)
  console.error('Error occurred:', {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: request.url,
    method: request.method,
    userId: (request.user as any)?.id,
  });

  // 1. Handle AppError (our custom errors)
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: error.message,
      code: error.code,
      details: error.details,
    });
  }

  // 2. Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      const target = (error.meta?.target as string[]) || [];
      return reply.code(409).send({
        error: 'Duplicate entry',
        code: 'DUPLICATE_ENTRY',
        field: target[0],
        details: { fields: target },
      });
    }

    // Record not found
    if (error.code === 'P2025') {
      return reply.code(404).send({
        error: 'Record not found',
        code: 'NOT_FOUND',
      });
    }

    // Foreign key constraint failed
    if (error.code === 'P2003') {
      return reply.code(400).send({
        error: 'Invalid reference',
        code: 'FOREIGN_KEY_VIOLATION',
        details: error.meta,
      });
    }

    // Required field missing
    if (error.code === 'P2011' || error.code === 'P2012') {
      return reply.code(400).send({
        error: 'Missing required field',
        code: 'MISSING_FIELD',
        details: error.meta,
      });
    }

    // Generic Prisma error
    return reply.code(400).send({
      error: 'Database operation failed',
      code: `PRISMA_${error.code}`,
      details: process.env.NODE_ENV === 'development' ? error.meta : undefined,
    });
  }

  // 3. Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return reply.code(400).send({
      error: 'Invalid data provided',
      code: 'VALIDATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }

  // 4. Handle Fastify validation errors (from schema validation)
  if ('validation' in error && error.validation) {
    return reply.code(400).send({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.validation,
    });
  }

  // 5. Handle authentication errors (from @fastify/jwt or custom auth)
  if (error.message?.includes('Authorization') || error.message?.includes('token')) {
    return reply.code(401).send({
      error: 'Authentication failed',
      code: 'UNAUTHORIZED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }

  // 6. Unknown/unexpected error
  // In production, don't leak implementation details
  const isDevelopment = process.env.NODE_ENV === 'development';

  return reply.code(500).send({
    error: isDevelopment ? error.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
    details: isDevelopment
      ? {
          stack: error.stack,
          name: error.name,
        }
      : undefined,
  });
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 *
 * Usage:
 * server.get('/api/deals/:id', asyncHandler(async (request, reply) => {
 *   const deal = await dealRepository.findById(request.params.id);
 *   if (!deal) throw new NotFoundError('Deal', request.params.id);
 *   return deal;
 * }));
 */
export function asyncHandler(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<any>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handler(request, reply);
    } catch (error) {
      // Let Fastify's error handler handle it
      throw error;
    }
  };
}
