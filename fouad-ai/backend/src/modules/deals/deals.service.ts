import { prisma } from '../../lib/prisma';
import { createAuditLog, getAuditTrail } from '../../lib/audit';
import { DealStatus } from '@prisma/client';

interface CreateDealParams {
  title: string;
  description?: string;
  parties: Array<{
    role: string;
    name: string;
    isOrganization: boolean;
    organizationId?: string;
    contactEmail: string;
    contactPhone?: string;
  }>;
}

export async function createDeal(params: CreateDealParams) {
  // Generate unique deal number
  const count = await prisma.deal.count();
  const dealNumber = `DEAL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  
  // Generate unique email for this deal
  const dealId = generateDealId();
  const emailAddress = `deal-${dealId}@${process.env.INBOUND_EMAIL_DOMAIN || 'fouad.ai'}`;

  const deal = await prisma.deal.create({
    data: {
      id: dealId,
      dealNumber,
      title: params.title,
      description: params.description,
      emailAddress,
      status: DealStatus.DRAFT,
      parties: {
        create: params.parties.map((party) => ({
          role: party.role as any,
          name: party.name,
          isOrganization: party.isOrganization,
          organizationId: party.organizationId,
          contactEmail: party.contactEmail,
          contactPhone: party.contactPhone,
        })),
      },
    },
    include: {
      parties: true,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: deal.id,
    eventType: 'DEAL_CREATED',
    actor: 'SYSTEM', // Replace with actual user ID from auth
    entityType: 'Deal',
    entityId: deal.id,
    newState: { status: deal.status },
  });

  return deal;
}

export async function listDeals(options: {
  status?: DealStatus;
  page: number;
  limit: number;
}) {
  const { status, page, limit } = options;
  const skip = (page - 1) * limit;

  const where = status ? { status } : {};

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: {
        parties: true,
        _count: {
          select: {
            contracts: true,
            evidenceItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.deal.count({ where }),
  ]);

  return {
    deals,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getDealById(id: string) {
  return prisma.deal.findUnique({
    where: { id },
    include: {
      parties: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      contracts: {
        where: { isEffective: true },
        include: {
          milestones: {
            orderBy: { sequence: 'asc' },
          },
        },
      },
      evidenceItems: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      custodyRecords: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function updateDealStatus(
  dealId: string,
  newStatus: DealStatus,
  actorId: string
) {
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  
  if (!deal) {
    throw new Error('Deal not found');
  }

  const oldStatus = deal.status;

  const updated = await prisma.deal.update({
    where: { id: dealId },
    data: { status: newStatus },
  });

  // Create audit log
  await createAuditLog({
    dealId,
    eventType: 'DEAL_STATUS_CHANGED',
    actor: actorId,
    entityType: 'Deal',
    entityId: dealId,
    oldState: { status: oldStatus },
    newState: { status: newStatus },
  });

  return updated;
}

export async function getDealAuditTrail(dealId: string) {
  return getAuditTrail(dealId);
}

function generateDealId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
