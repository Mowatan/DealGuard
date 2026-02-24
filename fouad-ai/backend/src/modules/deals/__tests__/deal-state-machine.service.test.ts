/**
 * Deal State Machine Service Tests
 * Tests for centralized deal activation and state transition logic
 */

import { checkAndActivateDeal, initializeMilestoneNegotiation } from '../deal-state-machine.service';
import { prismaMock } from '../../../__tests__/jest.setup';
import { createMockDeal, createMockParty, createMockContract, createMockMilestone } from '../../../__tests__/helpers';
import { DealStatus, InvitationStatus, MilestoneStatus } from '@prisma/client';

describe('Deal State Machine Service', () => {
  describe('checkAndActivateDeal', () => {
    it('should activate deal when all parties accepted and no milestones', async () => {
      const deal = createMockDeal({ status: DealStatus.INVITED });
      const party1 = createMockParty({ dealId: deal.id, invitationStatus: InvitationStatus.ACCEPTED });
      const party2 = createMockParty({ dealId: deal.id, invitationStatus: InvitationStatus.ACCEPTED });

      // Mock database calls
      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal,
        parties: [party1, party2],
        contracts: [],
      } as any);

      prismaMock.party.count.mockResolvedValue(0); // No pending parties

      prismaMock.deal.update.mockResolvedValue({
        ...deal,
        status: DealStatus.ACCEPTED,
      } as any);

      // Execute
      const result = await checkAndActivateDeal(deal.id, 'test-user-id');

      // Assertions
      expect(result.activated).toBe(true);
      expect(result.status).toBe(DealStatus.ACCEPTED);
      expect(result.reason).toContain('activated');

      // Verify database updates
      expect(prismaMock.deal.update).toHaveBeenCalledWith({
        where: { id: deal.id },
        data: {
          status: DealStatus.ACCEPTED,
          allPartiesConfirmed: true,
        },
      });
    });

    it('should NOT activate when parties have not all accepted', async () => {
      const deal = createMockDeal({ status: DealStatus.INVITED });
      const party1 = createMockParty({ dealId: deal.id, invitationStatus: InvitationStatus.ACCEPTED });
      const party2 = createMockParty({ dealId: deal.id, invitationStatus: InvitationStatus.PENDING });

      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal,
        parties: [party1, party2],
        contracts: [],
      } as any);

      prismaMock.party.count.mockResolvedValue(1); // 1 pending party

      // Execute
      const result = await checkAndActivateDeal(deal.id, 'test-user-id');

      // Assertions
      expect(result.activated).toBe(false);
      expect(result.reason).toContain('Waiting for');
      expect(result.reason).toContain('parties to accept');
      expect(prismaMock.deal.update).not.toHaveBeenCalled();
    });

    it('should transition to PENDING_NEGOTIATION when milestones exist and not all approved', async () => {
      const deal = createMockDeal({ status: DealStatus.INVITED });
      const party1 = createMockParty({ dealId: deal.id, invitationStatus: InvitationStatus.ACCEPTED });
      const party2 = createMockParty({ dealId: deal.id, invitationStatus: InvitationStatus.ACCEPTED });
      const contract = createMockContract({ dealId: deal.id });
      const milestone1 = createMockMilestone({ contractId: contract.id, status: MilestoneStatus.PENDING_RESPONSES });
      const milestone2 = createMockMilestone({ contractId: contract.id, status: MilestoneStatus.PENDING_RESPONSES });

      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal,
        parties: [party1, party2],
        contracts: [{
          ...contract,
          milestones: [milestone1, milestone2],
        }],
      } as any);

      prismaMock.party.count.mockResolvedValue(0); // All accepted

      prismaMock.deal.update.mockResolvedValue({
        ...deal,
        status: DealStatus.PENDING_NEGOTIATION,
      } as any);

      // Execute
      const result = await checkAndActivateDeal(deal.id, 'test-user-id');

      // Assertions
      expect(result.activated).toBe(false);
      expect(result.status).toBe(DealStatus.PENDING_NEGOTIATION);
      expect(result.reason).toContain('milestones to be approved');

      // Verify transition to PENDING_NEGOTIATION
      expect(prismaMock.deal.update).toHaveBeenCalledWith({
        where: { id: deal.id },
        data: { status: DealStatus.PENDING_NEGOTIATION },
      });
    });

    it('should activate when all milestones are approved', async () => {
      const deal = createMockDeal({ status: DealStatus.PENDING_NEGOTIATION });
      const party1 = createMockParty({ dealId: deal.id, invitationStatus: InvitationStatus.ACCEPTED });
      const party2 = createMockParty({ dealId: deal.id, invitationStatus: InvitationStatus.ACCEPTED });
      const contract = createMockContract({ dealId: deal.id });
      const milestone1 = createMockMilestone({ contractId: contract.id, status: MilestoneStatus.APPROVED });
      const milestone2 = createMockMilestone({ contractId: contract.id, status: MilestoneStatus.APPROVED });

      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal,
        parties: [party1, party2],
        contracts: [{
          ...contract,
          milestones: [milestone1, milestone2],
        }],
      } as any);

      prismaMock.party.count.mockResolvedValue(0); // All accepted

      prismaMock.deal.update.mockResolvedValue({
        ...deal,
        status: DealStatus.ACCEPTED,
      } as any);

      // Execute
      const result = await checkAndActivateDeal(deal.id, 'test-user-id');

      // Assertions
      expect(result.activated).toBe(true);
      expect(result.status).toBe(DealStatus.ACCEPTED);
      expect(result.reason).toContain('activated');
    });

    it('should throw error if deal not found', async () => {
      prismaMock.deal.findUnique.mockResolvedValue(null);

      await expect(checkAndActivateDeal('non-existent-id', 'user-id')).rejects.toThrow('Deal not found');
    });

    it('should handle mixed milestone statuses correctly', async () => {
      const deal = createMockDeal({ status: DealStatus.PENDING_NEGOTIATION });
      const contract = createMockContract({ dealId: deal.id });
      const milestone1 = createMockMilestone({ contractId: contract.id, status: MilestoneStatus.APPROVED });
      const milestone2 = createMockMilestone({ contractId: contract.id, status: MilestoneStatus.REJECTED });
      const milestone3 = createMockMilestone({ contractId: contract.id, status: MilestoneStatus.PENDING_RESPONSES });

      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal,
        parties: [],
        contracts: [{
          ...contract,
          milestones: [milestone1, milestone2, milestone3],
        }],
      } as any);

      prismaMock.party.count.mockResolvedValue(0);

      // Execute
      const result = await checkAndActivateDeal(deal.id, 'test-user-id');

      // Should not activate because not all milestones are approved
      expect(result.activated).toBe(false);
      expect(result.reason).toContain('milestone');
    });
  });

  describe('initializeMilestoneNegotiation', () => {
    it('should initialize all milestones to PENDING_RESPONSES status', async () => {
      const deal = createMockDeal();
      const contract = createMockContract({ dealId: deal.id });
      const milestone1 = createMockMilestone({ contractId: contract.id, status: MilestoneStatus.PENDING });
      const milestone2 = createMockMilestone({ contractId: contract.id, status: MilestoneStatus.PENDING });

      prismaMock.contract.findFirst.mockResolvedValue({
        ...contract,
        milestones: [milestone1, milestone2],
      } as any);

      prismaMock.milestone.updateMany.mockResolvedValue({ count: 2 } as any);

      // Execute
      await initializeMilestoneNegotiation(deal.id);

      // Verify milestones were updated
      expect(prismaMock.milestone.updateMany).toHaveBeenCalledWith({
        where: { contractId: contract.id },
        data: { status: MilestoneStatus.PENDING_RESPONSES },
      });
    });

    it('should do nothing if no contract exists', async () => {
      prismaMock.contract.findFirst.mockResolvedValue(null);

      // Execute
      await initializeMilestoneNegotiation('deal-id');

      // Should not attempt to update milestones
      expect(prismaMock.milestone.updateMany).not.toHaveBeenCalled();
    });

    it('should do nothing if no milestones exist', async () => {
      const contract = createMockContract({ dealId: 'deal-id' });

      prismaMock.contract.findFirst.mockResolvedValue({
        ...contract,
        milestones: [],
      } as any);

      // Execute
      await initializeMilestoneNegotiation('deal-id');

      // Should not attempt to update milestones
      expect(prismaMock.milestone.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('State Transition Validation', () => {
    it('should respect valid state transitions', async () => {
      // INVITED → PENDING_NEGOTIATION → ACCEPTED is valid
      const deal1 = createMockDeal({ status: DealStatus.INVITED });
      const contract = createMockContract({ dealId: deal1.id });
      const milestone = createMockMilestone({ contractId: contract.id, status: MilestoneStatus.PENDING_RESPONSES });

      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal1,
        parties: [],
        contracts: [{
          ...contract,
          milestones: [milestone],
        }],
      } as any);

      prismaMock.party.count.mockResolvedValue(0);
      prismaMock.deal.update.mockResolvedValue({
        ...deal1,
        status: DealStatus.PENDING_NEGOTIATION,
      } as any);

      const result = await checkAndActivateDeal(deal1.id, 'user-id');
      expect(result.status).toBe(DealStatus.PENDING_NEGOTIATION);
    });

    it('should handle edge case: deal with no parties', async () => {
      const deal = createMockDeal({ status: DealStatus.INVITED }); // Start from INVITED, not CREATED

      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal,
        parties: [],
        contracts: [],
      } as any);

      prismaMock.party.count.mockResolvedValue(0);

      // This should activate (vacuously true - no parties means all accepted)
      prismaMock.deal.update.mockResolvedValue({
        ...deal,
        status: DealStatus.ACCEPTED,
      } as any);

      const result = await checkAndActivateDeal(deal.id, 'user-id');
      expect(result.activated).toBe(true);
    });
  });
});
