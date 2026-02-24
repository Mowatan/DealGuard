/**
 * Authorization Service Tests
 * Tests for resource-based authorization logic
 */

import {
  canUserAccessDeal,
  canUserAccessMilestone,
  canUserAccessContract,
  canUserAccessEvidence,
  canUserAccessCustodyRecord,
  isUserPartyMember,
  isAdmin,
  isAdminOrCaseOfficer,
} from '../authorization';
import { prismaMock } from '../../__tests__/jest.setup';
import { createMockUser, createMockDeal, createMockParty } from '../../__tests__/helpers';

describe('Authorization Service', () => {
  describe('canUserAccessDeal', () => {
    it('should allow access if user is deal creator', async () => {
      const user = createMockUser();
      const deal = createMockDeal({ creatorId: user.id });

      prismaMock.user.findUnique.mockResolvedValue(user as any);
      prismaMock.deal.findFirst.mockResolvedValue(deal as any);

      const result = await canUserAccessDeal(deal.id, user.id);

      expect(result).toBe(true);
      expect(prismaMock.deal.findFirst).toHaveBeenCalledWith({
        where: { id: deal.id, creatorId: user.id },
      });
    });

    it('should allow access if user is party member', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const party = createMockParty({ dealId: deal.id });

      prismaMock.user.findUnique.mockResolvedValue(user as any);
      prismaMock.deal.findFirst.mockResolvedValue(null); // Not creator
      prismaMock.partyMember.findFirst.mockResolvedValue({
        id: 'member-id',
        userId: user.id,
        partyId: party.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await canUserAccessDeal(deal.id, user.id);

      expect(result).toBe(true);
      expect(prismaMock.partyMember.findFirst).toHaveBeenCalledWith({
        where: {
          userId: user.id,
          party: { dealId: deal.id },
        },
      });
    });

    it('should allow access if user is admin', async () => {
      const admin = createMockUser({ role: 'ADMIN' });
      const deal = createMockDeal();

      prismaMock.user.findUnique.mockResolvedValue(admin as any);

      const result = await canUserAccessDeal(deal.id, admin.id);

      expect(result).toBe(true);
      // Should not check deal ownership for admin
      expect(prismaMock.deal.findFirst).not.toHaveBeenCalled();
    });

    it('should allow access if user is super admin', async () => {
      const superAdmin = createMockUser({ role: 'SUPER_ADMIN' });
      const deal = createMockDeal();

      prismaMock.user.findUnique.mockResolvedValue(superAdmin as any);

      const result = await canUserAccessDeal(deal.id, superAdmin.id);

      expect(result).toBe(true);
    });

    it('should allow access if user is case officer', async () => {
      const caseOfficer = createMockUser({ role: 'CASE_OFFICER' });
      const deal = createMockDeal();

      prismaMock.user.findUnique.mockResolvedValue(caseOfficer as any);

      const result = await canUserAccessDeal(deal.id, caseOfficer.id);

      expect(result).toBe(true);
    });

    it('should deny access if user has no relationship to deal', async () => {
      const user = createMockUser({ role: 'PARTY_USER' });
      const deal = createMockDeal();

      prismaMock.user.findUnique.mockResolvedValue(user as any);
      prismaMock.deal.findFirst.mockResolvedValue(null); // Not creator
      prismaMock.partyMember.findFirst.mockResolvedValue(null); // Not party member

      const result = await canUserAccessDeal(deal.id, user.id);

      expect(result).toBe(false);
    });

    it('should deny access if user does not exist', async () => {
      const deal = createMockDeal();

      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await canUserAccessDeal(deal.id, 'non-existent-user');

      expect(result).toBe(false);
    });
  });

  describe('canUserAccessMilestone', () => {
    it('should allow access if user can access milestone deal', async () => {
      const user = createMockUser();
      const deal = createMockDeal({ creatorId: user.id });

      prismaMock.milestone.findUnique.mockResolvedValue({
        id: 'milestone-id',
        contract: {
          dealId: deal.id,
        },
      } as any);

      prismaMock.user.findUnique.mockResolvedValue(user as any);
      prismaMock.deal.findFirst.mockResolvedValue(deal as any);

      const result = await canUserAccessMilestone('milestone-id', user.id);

      expect(result).toBe(true);
    });

    it('should deny access if milestone not found', async () => {
      prismaMock.milestone.findUnique.mockResolvedValue(null);

      const result = await canUserAccessMilestone('non-existent', 'user-id');

      expect(result).toBe(false);
    });
  });

  describe('canUserAccessContract', () => {
    it('should allow access if user can access contract deal', async () => {
      const user = createMockUser();
      const deal = createMockDeal({ creatorId: user.id });

      prismaMock.contract.findUnique.mockResolvedValue({
        id: 'contract-id',
        dealId: deal.id,
      } as any);

      prismaMock.user.findUnique.mockResolvedValue(user as any);
      prismaMock.deal.findFirst.mockResolvedValue(deal as any);

      const result = await canUserAccessContract('contract-id', user.id);

      expect(result).toBe(true);
    });

    it('should deny access if contract not found', async () => {
      prismaMock.contract.findUnique.mockResolvedValue(null);

      const result = await canUserAccessContract('non-existent', 'user-id');

      expect(result).toBe(false);
    });
  });

  describe('canUserAccessEvidence', () => {
    it('should allow access if user can access evidence deal', async () => {
      const user = createMockUser();
      const deal = createMockDeal({ creatorId: user.id });

      prismaMock.evidenceItem.findUnique.mockResolvedValue({
        id: 'evidence-id',
        dealId: deal.id,
      } as any);

      prismaMock.user.findUnique.mockResolvedValue(user as any);
      prismaMock.deal.findFirst.mockResolvedValue(deal as any);

      const result = await canUserAccessEvidence('evidence-id', user.id);

      expect(result).toBe(true);
    });

    it('should deny access if evidence not found', async () => {
      prismaMock.evidenceItem.findUnique.mockResolvedValue(null);

      const result = await canUserAccessEvidence('non-existent', 'user-id');

      expect(result).toBe(false);
    });
  });

  describe('canUserAccessCustodyRecord', () => {
    it('should allow access if user can access custody record deal', async () => {
      const user = createMockUser();
      const deal = createMockDeal({ creatorId: user.id });

      prismaMock.custodyRecord.findUnique.mockResolvedValue({
        id: 'custody-id',
        dealId: deal.id,
      } as any);

      prismaMock.user.findUnique.mockResolvedValue(user as any);
      prismaMock.deal.findFirst.mockResolvedValue(deal as any);

      const result = await canUserAccessCustodyRecord('custody-id', user.id);

      expect(result).toBe(true);
    });

    it('should deny access if custody record not found', async () => {
      prismaMock.custodyRecord.findUnique.mockResolvedValue(null);

      const result = await canUserAccessCustodyRecord('non-existent', 'user-id');

      expect(result).toBe(false);
    });
  });

  describe('isUserPartyMember', () => {
    it('should return true if user is party member', async () => {
      const user = createMockUser();
      const party = createMockParty();

      prismaMock.partyMember.findFirst.mockResolvedValue({
        id: 'member-id',
        userId: user.id,
        partyId: party.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await isUserPartyMember(user.id, party.id);

      expect(result).toBe(true);
      expect(prismaMock.partyMember.findFirst).toHaveBeenCalledWith({
        where: {
          userId: user.id,
          partyId: party.id,
        },
      });
    });

    it('should return false if user is not party member', async () => {
      prismaMock.partyMember.findFirst.mockResolvedValue(null);

      const result = await isUserPartyMember('user-id', 'party-id');

      expect(result).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for ADMIN role', async () => {
      const admin = createMockUser({ role: 'ADMIN' });

      prismaMock.user.findUnique.mockResolvedValue(admin as any);

      const result = await isAdmin(admin.id);

      expect(result).toBe(true);
    });

    it('should return true for SUPER_ADMIN role', async () => {
      const superAdmin = createMockUser({ role: 'SUPER_ADMIN' });

      prismaMock.user.findUnique.mockResolvedValue(superAdmin as any);

      const result = await isAdmin(superAdmin.id);

      expect(result).toBe(true);
    });

    it('should return false for non-admin roles', async () => {
      const user = createMockUser({ role: 'PARTY_USER' });

      prismaMock.user.findUnique.mockResolvedValue(user as any);

      const result = await isAdmin(user.id);

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await isAdmin('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('isAdminOrCaseOfficer', () => {
    it('should return true for CASE_OFFICER role', async () => {
      const caseOfficer = createMockUser({ role: 'CASE_OFFICER' });

      prismaMock.user.findUnique.mockResolvedValue(caseOfficer as any);

      const result = await isAdminOrCaseOfficer(caseOfficer.id);

      expect(result).toBe(true);
    });

    it('should return true for ADMIN role', async () => {
      const admin = createMockUser({ role: 'ADMIN' });

      prismaMock.user.findUnique.mockResolvedValue(admin as any);

      const result = await isAdminOrCaseOfficer(admin.id);

      expect(result).toBe(true);
    });

    it('should return true for SUPER_ADMIN role', async () => {
      const superAdmin = createMockUser({ role: 'SUPER_ADMIN' });

      prismaMock.user.findUnique.mockResolvedValue(superAdmin as any);

      const result = await isAdminOrCaseOfficer(superAdmin.id);

      expect(result).toBe(true);
    });

    it('should return false for PARTY_USER role', async () => {
      const user = createMockUser({ role: 'PARTY_USER' });

      prismaMock.user.findUnique.mockResolvedValue(user as any);

      const result = await isAdminOrCaseOfficer(user.id);

      expect(result).toBe(false);
    });
  });
});
