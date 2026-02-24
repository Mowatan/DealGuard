/**
 * Milestone Negotiation Service Tests
 * Tests for milestone response submission and consensus logic
 */

import {
  submitMilestoneResponse,
  getMilestoneResponses,
} from '../milestone-negotiation.service';
import { prismaMock } from '../../../__tests__/jest.setup';
import {
  createMockDeal,
  createMockParty,
  createMockContract,
  createMockMilestone,
  createMockUser,
} from '../../../__tests__/helpers';
import { MilestoneStatus, MilestoneResponseType } from '@prisma/client';

describe('Milestone Negotiation Service', () => {
  describe('submitMilestoneResponse', () => {
    it('should submit ACCEPTED response successfully', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const party = createMockParty({ dealId: deal.id });
      const contract = createMockContract({ dealId: deal.id });
      const milestone = createMockMilestone({ contractId: contract.id, status: MilestoneStatus.PENDING_RESPONSES });

      // Mock party membership check
      prismaMock.partyMember.findFirst.mockResolvedValue({
        id: 'member-id',
        partyId: party.id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Mock milestone fetch (first call in submitMilestoneResponse)
      prismaMock.milestone.findUnique.mockResolvedValueOnce({
        ...milestone,
        contract: {
          ...contract,
          deal: {
            ...deal,
            parties: [party],
          },
        },
      } as any);

      // Mock response upsert
      const mockResponse = {
        id: 'response-id',
        milestoneId: milestone.id,
        partyId: party.id,
        responseType: MilestoneResponseType.ACCEPTED,
        amendmentProposal: null,
        notes: null,
        respondedAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.milestonePartyResponse.upsert.mockResolvedValue(mockResponse as any);

      // Mock second milestone fetch (inside updateMilestoneStatus)
      prismaMock.milestone.findUnique.mockResolvedValueOnce({
        ...milestone,
        contract: {
          ...contract,
          deal: {
            ...deal,
            parties: [party],
          },
        },
        partyResponses: [mockResponse],
      } as any);

      // Mock milestone status update
      prismaMock.milestone.update.mockResolvedValue({
        ...milestone,
        status: MilestoneStatus.PENDING_RESPONSES,
      } as any);

      // Mock deal fetch (for checkAndActivateDeal inside updateMilestoneStatus)
      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal,
        parties: [party],
        contracts: [{ ...contract, milestones: [milestone] }],
      } as any);

      prismaMock.party.count.mockResolvedValue(0); // All parties accepted

      // Execute
      const result = await submitMilestoneResponse(
        milestone.id,
        party.id,
        { responseType: MilestoneResponseType.ACCEPTED },
        user.id
      );

      // Assertions
      expect(result).toBeDefined();
      expect(result.responseType).toBe(MilestoneResponseType.ACCEPTED);
      expect(prismaMock.partyMember.findFirst).toHaveBeenCalledWith({
        where: { partyId: party.id, userId: user.id },
      });
      expect(prismaMock.milestonePartyResponse.upsert).toHaveBeenCalled();
    });

    it('should submit AMENDMENT_PROPOSED response with proposal details', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const party = createMockParty({ dealId: deal.id });
      const contract = createMockContract({ dealId: deal.id });
      const milestone = createMockMilestone({ contractId: contract.id });

      const amendmentProposal = {
        newAmount: 15000,
        newDeadline: '2026-12-31',
        reason: 'Budget constraints',
      };

      // Mock checks
      prismaMock.partyMember.findFirst.mockResolvedValue({ id: 'member-id' } as any);

      // First milestone fetch
      prismaMock.milestone.findUnique.mockResolvedValueOnce({
        ...milestone,
        contract: {
          ...contract,
          deal: {
            ...deal,
            parties: [party],
          },
        },
      } as any);

      const mockResponse = {
        id: 'response-id',
        milestoneId: milestone.id,
        partyId: party.id,
        responseType: MilestoneResponseType.AMENDMENT_PROPOSED,
        amendmentProposal: amendmentProposal as any,
        notes: null,
        respondedAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.milestonePartyResponse.upsert.mockResolvedValue(mockResponse as any);

      // Second milestone fetch (updateMilestoneStatus)
      prismaMock.milestone.findUnique.mockResolvedValueOnce({
        ...milestone,
        contract: {
          ...contract,
          deal: {
            ...deal,
            parties: [party],
          },
        },
        partyResponses: [mockResponse],
      } as any);

      prismaMock.milestone.update.mockResolvedValue(milestone as any);
      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal,
        parties: [party],
        contracts: [{ ...contract, milestones: [milestone] }],
      } as any);
      prismaMock.party.count.mockResolvedValue(0);

      // Execute
      const result = await submitMilestoneResponse(
        milestone.id,
        party.id,
        {
          responseType: MilestoneResponseType.AMENDMENT_PROPOSED,
          amendmentProposal,
        },
        user.id
      );

      // Assertions
      expect(result.responseType).toBe(MilestoneResponseType.AMENDMENT_PROPOSED);
      expect(result.amendmentProposal).toEqual(amendmentProposal);
    });

    it('should reject response if user is not party member', async () => {
      const user = createMockUser();
      const party = createMockParty();
      const milestone = createMockMilestone();

      // Mock: User is NOT a member
      prismaMock.partyMember.findFirst.mockResolvedValue(null);

      // Execute & Assert
      await expect(
        submitMilestoneResponse(
          milestone.id,
          party.id,
          { responseType: MilestoneResponseType.ACCEPTED },
          user.id
        )
      ).rejects.toThrow('not a member');
    });

    it('should allow updating an existing response', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const party = createMockParty({ dealId: deal.id });
      const contract = createMockContract({ dealId: deal.id });
      const milestone = createMockMilestone({ contractId: contract.id });

      // First response: REJECTED
      const existingResponse = {
        id: 'response-id',
        milestoneId: milestone.id,
        partyId: party.id,
        responseType: MilestoneResponseType.REJECTED,
        respondedAt: new Date(Date.now() - 1000),
      };

      prismaMock.partyMember.findFirst.mockResolvedValue({ id: 'member-id' } as any);

      // First milestone fetch
      prismaMock.milestone.findUnique.mockResolvedValueOnce({
        ...milestone,
        contract: {
          ...contract,
          deal: {
            ...deal,
            parties: [party],
          },
        },
      } as any);

      // Now updating to ACCEPTED
      const updatedResponse = {
        ...existingResponse,
        responseType: MilestoneResponseType.ACCEPTED,
        respondedAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.milestonePartyResponse.upsert.mockResolvedValue(updatedResponse as any);

      // Second milestone fetch (updateMilestoneStatus)
      prismaMock.milestone.findUnique.mockResolvedValueOnce({
        ...milestone,
        contract: {
          ...contract,
          deal: {
            ...deal,
            parties: [party],
          },
        },
        partyResponses: [updatedResponse],
      } as any);

      prismaMock.milestone.update.mockResolvedValue(milestone as any);
      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal,
        parties: [party],
        contracts: [{ ...contract, milestones: [milestone] }],
      } as any);
      prismaMock.party.count.mockResolvedValue(0);

      // Execute
      const result = await submitMilestoneResponse(
        milestone.id,
        party.id,
        { responseType: MilestoneResponseType.ACCEPTED },
        user.id
      );

      // Assertions
      expect(result.responseType).toBe(MilestoneResponseType.ACCEPTED);
      expect(prismaMock.milestonePartyResponse.upsert).toHaveBeenCalled();
    });
  });

  // Note: updateMilestoneStatus is internal and tested indirectly via submitMilestoneResponse

  describe('getMilestoneResponses', () => {
    it('should return milestone with all responses and summary', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const contract = createMockContract({ dealId: deal.id });
      const milestone = createMockMilestone({ contractId: contract.id });
      const party1 = createMockParty({ dealId: deal.id });
      const party2 = createMockParty({ dealId: deal.id });

      // Mock authorization
      prismaMock.milestone.findUnique.mockResolvedValue({
        ...milestone,
        contract: {
          ...contract,
          dealId: deal.id,
        },
      } as any);

      prismaMock.deal.findFirst.mockResolvedValue(deal as any);

      // Mock responses
      prismaMock.milestone.findUnique.mockResolvedValue({
        ...milestone,
        contract: {
          ...contract,
          deal: {
            ...deal,
            parties: [party1, party2],
          },
        },
        partyResponses: [
          {
            id: 'resp1',
            partyId: party1.id,
            responseType: MilestoneResponseType.ACCEPTED,
            party: party1,
          },
          {
            id: 'resp2',
            partyId: party2.id,
            responseType: MilestoneResponseType.ACCEPTED,
            party: party2,
          },
        ],
      } as any);

      // Execute
      const result = await getMilestoneResponses(milestone.id, user.id);

      // Assertions
      expect(result).toBeDefined();
      expect(result.milestone).toBeDefined();
      expect(result.responses).toHaveLength(2);
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(2);
      expect(result.summary.accepted).toBe(2);
      expect(result.summary.pending).toBe(0);
    });
  });
});
