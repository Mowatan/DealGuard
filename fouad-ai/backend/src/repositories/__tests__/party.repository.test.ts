/**
 * Party Repository Tests
 * Tests for party data access functions
 */

import {
  findPartyByInvitationToken,
  checkAllPartiesAccepted,
  findPartiesByDeal,
} from '../party.repository';
import { prismaMock } from '../../__tests__/jest.setup';
import { createMockDeal, createMockParty } from '../../__tests__/helpers';
import { InvitationStatus } from '@prisma/client';

describe('Party Repository', () => {
  describe('findPartyByInvitationToken', () => {
    it('should find party with valid token', async () => {
      const deal = createMockDeal();
      const party = createMockParty({ dealId: deal.id, invitationToken: 'valid-token' });

      prismaMock.party.findUnique.mockResolvedValue({
        ...party,
        deal: {
          ...deal,
          parties: [party],
        },
      } as any);

      const result = await findPartyByInvitationToken('valid-token');

      expect(result).toBeDefined();
      expect(result?.id).toBe(party.id);
      expect(result?.deal).toBeDefined();
      expect(prismaMock.party.findUnique).toHaveBeenCalledWith({
        where: { invitationToken: 'valid-token' },
        include: {
          deal: {
            include: {
              parties: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                  invitationStatus: true,
                },
              },
            },
          },
        },
      });
    });

    it('should return null for invalid token', async () => {
      prismaMock.party.findUnique.mockResolvedValue(null);

      const result = await findPartyByInvitationToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should include deal and parties data', async () => {
      const deal = createMockDeal();
      const party1 = createMockParty({ dealId: deal.id, invitationToken: 'token-1' });
      const party2 = createMockParty({ dealId: deal.id });

      prismaMock.party.findUnique.mockResolvedValue({
        ...party1,
        deal: {
          ...deal,
          parties: [party1, party2],
        },
      } as any);

      const result = await findPartyByInvitationToken('token-1');

      expect(result?.deal.parties).toHaveLength(2);
      expect(result?.deal.id).toBe(deal.id);
    });
  });

  describe('checkAllPartiesAccepted', () => {
    it('should return true when all parties accepted', async () => {
      const deal = createMockDeal();

      prismaMock.party.count.mockResolvedValue(0); // No pending parties

      const result = await checkAllPartiesAccepted(deal.id);

      expect(result).toBe(true);
      expect(prismaMock.party.count).toHaveBeenCalledWith({
        where: {
          dealId: deal.id,
          invitationStatus: { not: 'ACCEPTED' },
        },
      });
    });

    it('should return false when some parties pending', async () => {
      const deal = createMockDeal();

      prismaMock.party.count.mockResolvedValue(2); // 2 pending parties

      const result = await checkAllPartiesAccepted(deal.id);

      expect(result).toBe(false);
    });
  });

  describe('findPartiesByDeal', () => {
    it('should return all parties for a deal', async () => {
      const deal = createMockDeal();
      const party1 = createMockParty({ dealId: deal.id });
      const party2 = createMockParty({ dealId: deal.id });

      prismaMock.party.findMany.mockResolvedValue([
        { ...party1, members: [] },
        { ...party2, members: [] },
      ] as any);

      const result = await findPartiesByDeal(deal.id);

      expect(result).toHaveLength(2);
      expect(prismaMock.party.findMany).toHaveBeenCalledWith({
        where: { dealId: deal.id },
        include: { members: true },
      });
    });

    it('should return empty array if no parties exist', async () => {
      prismaMock.party.findMany.mockResolvedValue([]);

      const result = await findPartiesByDeal('non-existent-deal');

      expect(result).toHaveLength(0);
    });

    it('should include party members', async () => {
      const deal = createMockDeal();
      const party = createMockParty({ dealId: deal.id });

      prismaMock.party.findMany.mockResolvedValue([
        {
          ...party,
          members: [
            { id: 'member-1', userId: 'user-1', partyId: party.id },
            { id: 'member-2', userId: 'user-2', partyId: party.id },
          ],
        },
      ] as any);

      const result = await findPartiesByDeal(deal.id);

      expect(result[0].members).toHaveLength(2);
    });
  });
});
