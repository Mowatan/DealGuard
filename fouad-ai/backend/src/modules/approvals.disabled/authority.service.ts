import { PrismaClient, ApprovalType, UserRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class AuthorityService {
  /**
   * Super admin delegates authority to user
   */
  async delegateAuthority(
    delegatedBy: string,
    delegatedTo: string,
    config: {
      approvalTypes: ApprovalType[];
      maxAmount?: number;
      requiresSeniorReview?: boolean;
      validUntil?: Date;
      notes?: string;
    }
  ) {
    // Verify delegator is super admin
    const delegator = await prisma.user.findUnique({
      where: { id: delegatedBy }
    });

    if (delegator?.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Only super admin can delegate authority');
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: delegatedTo }
    });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Create delegation
    const delegation = await prisma.authorityDelegation.create({
      data: {
        delegatedTo,
        delegatedBy,
        approvalTypes: config.approvalTypes.map(t => t.toString()),
        maxAmount: config.maxAmount ? new Decimal(config.maxAmount) : null,
        requiresSeniorReview: config.requiresSeniorReview ?? true,
        validUntil: config.validUntil,
        isActive: true,
        notes: config.notes,
      },
      include: {
        user: true,
        delegator: true,
      }
    });

    // Update user's delegated authority
    await prisma.user.update({
      where: { id: delegatedTo },
      data: {
        delegatedAuthority: config,
        assignedBy: delegatedBy,
        assignedAt: new Date(),
      }
    });

    return delegation;
  }

  /**
   * Update existing delegation
   */
  async updateDelegation(
    delegationId: string,
    updatedBy: string,
    updates: {
      approvalTypes?: ApprovalType[];
      maxAmount?: number;
      requiresSeniorReview?: boolean;
      validUntil?: Date;
      isActive?: boolean;
      notes?: string;
    }
  ) {
    // Verify updater is super admin
    const updater = await prisma.user.findUnique({
      where: { id: updatedBy }
    });

    if (updater?.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Only super admin can update authority delegation');
    }

    const updateData: any = {};

    if (updates.approvalTypes !== undefined) {
      updateData.approvalTypes = updates.approvalTypes.map(t => t.toString());
    }
    if (updates.maxAmount !== undefined) {
      updateData.maxAmount = new Decimal(updates.maxAmount);
    }
    if (updates.requiresSeniorReview !== undefined) {
      updateData.requiresSeniorReview = updates.requiresSeniorReview;
    }
    if (updates.validUntil !== undefined) {
      updateData.validUntil = updates.validUntil;
    }
    if (updates.isActive !== undefined) {
      updateData.isActive = updates.isActive;
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }

    const delegation = await prisma.authorityDelegation.update({
      where: { id: delegationId },
      data: updateData,
      include: {
        user: true,
        delegator: true,
      }
    });

    // Update user's delegated authority if relevant fields changed
    if (updates.approvalTypes || updates.maxAmount !== undefined || updates.requiresSeniorReview !== undefined) {
      const currentAuth = delegation.user.delegatedAuthority as any || {};
      await prisma.user.update({
        where: { id: delegation.delegatedTo },
        data: {
          delegatedAuthority: {
            ...currentAuth,
            ...(updates.approvalTypes && { approvalTypes: updates.approvalTypes }),
            ...(updates.maxAmount !== undefined && { maxAmount: updates.maxAmount }),
            ...(updates.requiresSeniorReview !== undefined && { requiresSeniorReview: updates.requiresSeniorReview }),
          }
        }
      });
    }

    return delegation;
  }

  /**
   * Check if user can approve specific request
   */
  async canUserApprove(
    userId: string,
    approvalType: ApprovalType,
    amount?: number
  ): Promise<{
    canApprove: boolean;
    reason?: string;
    requiresSeniorReview?: boolean;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return { canApprove: false, reason: 'User not found' };
    }

    // Super admin can approve everything
    if (user.role === UserRole.SUPER_ADMIN) {
      return { canApprove: true, requiresSeniorReview: false };
    }

    // Senior escrow officers have broader authority
    if (user.role === UserRole.SENIOR_ESCROW_OFFICER) {
      return { canApprove: true, requiresSeniorReview: false };
    }

    // Check delegated authority for escrow officers and others
    const delegation = await prisma.authorityDelegation.findFirst({
      where: {
        delegatedTo: userId,
        isActive: true,
        approvalTypes: { has: approvalType.toString() },
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } }
        ]
      }
    });

    if (!delegation) {
      return {
        canApprove: false,
        reason: `No active delegation found for ${approvalType}`
      };
    }

    // Check amount limit
    if (amount !== undefined && delegation.maxAmount) {
      const maxAmount = delegation.maxAmount.toNumber();
      if (amount > maxAmount) {
        return {
          canApprove: false,
          reason: `Amount ${amount} exceeds authorized limit ${maxAmount}`
        };
      }
    }

    return {
      canApprove: true,
      requiresSeniorReview: delegation.requiresSeniorReview
    };
  }

  /**
   * Get all delegations for a user
   */
  async getUserDelegations(userId: string) {
    return await prisma.authorityDelegation.findMany({
      where: {
        delegatedTo: userId,
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } }
        ]
      },
      include: {
        delegator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get all delegations created by a super admin
   */
  async getDelegationsByAdmin(adminId: string) {
    // Verify is super admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (admin?.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Only super admin can view all delegations');
    }

    return await prisma.authorityDelegation.findMany({
      where: {
        delegatedBy: adminId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get all active delegations (super admin only)
   */
  async getAllDelegations(requesterId: string) {
    // Verify is super admin
    const requester = await prisma.user.findUnique({
      where: { id: requesterId }
    });

    if (requester?.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Only super admin can view all delegations');
    }

    return await prisma.authorityDelegation.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        delegator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Revoke delegation
   */
  async revokeDelegation(delegationId: string, revokedBy: string) {
    // Verify revoker is super admin
    const revoker = await prisma.user.findUnique({
      where: { id: revokedBy }
    });

    if (revoker?.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Only super admin can revoke authority');
    }

    const delegation = await prisma.authorityDelegation.update({
      where: { id: delegationId },
      data: { isActive: false },
      include: {
        user: true,
      }
    });

    // Clear user's delegated authority
    await prisma.user.update({
      where: { id: delegation.delegatedTo },
      data: {
        delegatedAuthority: null,
        assignedBy: null,
        assignedAt: null,
      }
    });

    return delegation;
  }

  /**
   * Check if delegation is expired
   */
  isDelegationExpired(delegation: { validUntil: Date | null }): boolean {
    if (!delegation.validUntil) return false;
    return new Date() > delegation.validUntil;
  }

  /**
   * Get delegation statistics
   */
  async getDelegationStats(adminId: string) {
    // Verify is super admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (admin?.role !== UserRole.SUPER_ADMIN) {
      throw new Error('Only super admin can view delegation statistics');
    }

    const [totalActive, totalExpired, totalRevoked, byType] = await Promise.all([
      prisma.authorityDelegation.count({
        where: {
          isActive: true,
          OR: [
            { validUntil: null },
            { validUntil: { gt: new Date() } }
          ]
        }
      }),
      prisma.authorityDelegation.count({
        where: {
          isActive: true,
          validUntil: { lte: new Date() }
        }
      }),
      prisma.authorityDelegation.count({
        where: { isActive: false }
      }),
      prisma.authorityDelegation.groupBy({
        by: ['approvalTypes'],
        _count: true,
        where: { isActive: true }
      })
    ]);

    return {
      totalActive,
      totalExpired,
      totalRevoked,
      byType,
    };
  }
}

export const authorityService = new AuthorityService();
