import { prisma } from '../lib/prisma';
import { MilestoneStatus, Prisma } from '@prisma/client';

/**
 * Milestone Repository
 * Centralizes all database operations related to milestones
 */
export class MilestoneRepository {
  /**
   * Find milestone by ID
   */
  async findById(id: string) {
    return prisma.milestone.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            deal: {
              include: {
                parties: true,
              },
            },
          },
        },
        partyResponses: {
          include: {
            party: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find all milestones for a deal
   */
  async findByDeal(dealId: string) {
    const contract = await prisma.contract.findFirst({
      where: { dealId, isEffective: true },
      include: {
        milestones: {
          orderBy: { order: 'asc' },
          include: {
            partyResponses: true,
          },
        },
      },
    });

    return contract?.milestones || [];
  }

  /**
   * Find all milestones for a contract
   */
  async findByContract(contractId: string) {
    return prisma.milestone.findMany({
      where: { contractId },
      orderBy: { order: 'asc' },
      include: {
        partyResponses: true,
      },
    });
  }

  /**
   * Check if all milestones in a deal are approved
   */
  async checkAllApproved(dealId: string): Promise<boolean> {
    const contract = await prisma.contract.findFirst({
      where: { dealId, isEffective: true },
    });

    if (!contract) {
      return true; // No contract = no milestones to approve
    }

    const unapprovedCount = await prisma.milestone.count({
      where: {
        contractId: contract.id,
        status: {
          notIn: [MilestoneStatus.APPROVED, MilestoneStatus.COMPLETED],
        },
      },
    });

    return unapprovedCount === 0;
  }

  /**
   * Count milestones by status for a deal
   */
  async countByStatus(dealId: string, status: MilestoneStatus): Promise<number> {
    const contract = await prisma.contract.findFirst({
      where: { dealId, isEffective: true },
    });

    if (!contract) {
      return 0;
    }

    return prisma.milestone.count({
      where: {
        contractId: contract.id,
        status,
      },
    });
  }

  /**
   * Update milestone status
   */
  async updateStatus(milestoneId: string, status: MilestoneStatus) {
    return prisma.milestone.update({
      where: { id: milestoneId },
      data: { status },
    });
  }

  /**
   * Update milestone
   */
  async update(milestoneId: string, data: Prisma.MilestoneUpdateInput) {
    return prisma.milestone.update({
      where: { id: milestoneId },
      data,
    });
  }

  /**
   * Create a milestone
   */
  async create(data: Prisma.MilestoneCreateInput) {
    return prisma.milestone.create({
      data,
    });
  }

  /**
   * Create multiple milestones
   */
  async createMany(data: Prisma.MilestoneCreateManyInput[]) {
    return prisma.milestone.createMany({
      data,
    });
  }

  /**
   * Delete a milestone
   */
  async delete(milestoneId: string) {
    return prisma.milestone.delete({
      where: { id: milestoneId },
    });
  }

  /**
   * Get milestone with party responses
   */
  async findWithResponses(milestoneId: string) {
    return prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        partyResponses: {
          include: {
            party: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        contract: {
          include: {
            deal: {
              include: {
                parties: true,
              },
            },
          },
        },
      },
    });
  }
}

export const milestoneRepository = new MilestoneRepository();
