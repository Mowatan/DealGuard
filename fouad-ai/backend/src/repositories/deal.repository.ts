import { prisma } from '../lib/prisma';
import { Deal, DealStatus, Prisma } from '@prisma/client';

/**
 * Deal Repository
 * Centralizes all database operations related to deals
 */
export class DealRepository {
  /**
   * Find deal by ID with all relations
   */
  async findById(id: string) {
    return prisma.deal.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        parties: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
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
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  /**
   * Find all deals where user is involved (creator or party member)
   */
  async findUserDeals(userId: string) {
    return prisma.deal.findMany({
      where: {
        OR: [
          { creatorId: userId },
          {
            parties: {
              some: {
                members: {
                  some: { userId },
                },
              },
            },
          },
        ],
      },
      include: {
        parties: true,
        contracts: {
          where: { isEffective: true },
          include: {
            milestones: {
              select: {
                id: true,
                order: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new deal
   */
  async create(data: Prisma.DealCreateInput) {
    return prisma.deal.create({
      data,
      include: {
        parties: true,
        contracts: {
          include: {
            milestones: true,
          },
        },
      },
    });
  }

  /**
   * Update deal status
   */
  async updateStatus(dealId: string, status: DealStatus) {
    return prisma.deal.update({
      where: { id: dealId },
      data: {
        status,
        allPartiesConfirmed: status === DealStatus.ACCEPTED ? true : undefined,
      },
    });
  }

  /**
   * Update deal with arbitrary data
   */
  async update(dealId: string, data: Prisma.DealUpdateInput) {
    return prisma.deal.update({
      where: { id: dealId },
      data,
    });
  }

  /**
   * Delete a deal (soft delete by setting status to CANCELLED)
   */
  async delete(dealId: string) {
    return prisma.deal.update({
      where: { id: dealId },
      data: {
        status: DealStatus.CANCELLED,
      },
    });
  }

  /**
   * Count deals by status
   */
  async countByStatus(status: DealStatus): Promise<number> {
    return prisma.deal.count({
      where: { status },
    });
  }

  /**
   * Find deals by status
   */
  async findByStatus(status: DealStatus) {
    return prisma.deal.findMany({
      where: { status },
      include: {
        parties: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const dealRepository = new DealRepository();
