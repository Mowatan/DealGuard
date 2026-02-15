import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

export interface AuditLogParams {
  dealId?: string;
  eventType: string;
  actor: string;
  entityType: string;
  entityId: string;
  oldState?: any;
  newState?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  const payload = {
    eventType: params.eventType,
    entityType: params.entityType,
    entityId: params.entityId,
    oldState: params.oldState,
    newState: params.newState,
    timestamp: new Date().toISOString(),
  };

  const payloadHash = createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');

  return prisma.auditEvent.create({
    data: {
      dealId: params.dealId,
      eventType: params.eventType,
      actor: params.actor,
      entityType: params.entityType,
      entityId: params.entityId,
      oldState: params.oldState ? params.oldState : Prisma.JsonNull,
      newState: params.newState ? params.newState : Prisma.JsonNull,
      payloadHash,
      metadata: params.metadata ? params.metadata : Prisma.JsonNull,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function getAuditTrail(dealId: string) {
  return prisma.auditEvent.findMany({
    where: { dealId },
    orderBy: { timestamp: 'desc' },
    include: {
      actorUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
