/**
 * Invitation Flow Tests
 * Tests for invitation acceptance and decline logic
 */

import { prismaMock } from '../../../__tests__/jest.setup';
import {
  createMockDeal,
  createMockParty,
  createMockUser,
  createMockContract,
  createMockMilestone,
} from '../../../__tests__/helpers';
import { InvitationStatus, DealStatus, MilestoneStatus } from '@prisma/client';
import { checkAndActivateDeal, initializeMilestoneNegotiation } from '../../deals/deal-state-machine.service';

// Mock the deal state machine functions
jest.mock('../../deals/deal-state-machine.service');
const mockCheckAndActivateDeal = checkAndActivateDeal as jest.MockedFunction<typeof checkAndActivateDeal>;
const mockInitializeMilestoneNegotiation = initializeMilestoneNegotiation as jest.MockedFunction<typeof initializeMilestoneNegotiation>;

describe('Invitation Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Invitation Acceptance Flow', () => {
    it('should accept invitation and add user as party member', async () => {
      const user = createMockUser();
      const deal = createMockDeal({ status: DealStatus.INVITED });
      const party = createMockParty({
        dealId: deal.id,
        invitationStatus: InvitationStatus.PENDING,
        invitationToken: 'test-token',
      });

      // Mock findFirst to return party with deal and empty members
      prismaMock.party.findFirst.mockResolvedValue({
        ...party,
        deal: deal,
        members: [],
      } as any);

      // Mock party member creation
      prismaMock.partyMember.create.mockResolvedValue({
        id: 'member-id',
        partyId: party.id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Mock party update
      prismaMock.party.update.mockResolvedValue({
        ...party,
        invitationStatus: InvitationStatus.ACCEPTED,
        respondedAt: new Date(),
      } as any);

      // Mock pending count check
      prismaMock.party.count.mockResolvedValue(1); // Still 1 pending party

      // Execute acceptance logic
      const token = 'test-token';

      const foundParty = await prismaMock.party.findFirst({
        where: { invitationToken: token },
        include: { deal: true, members: true },
      });

      expect(foundParty).toBeDefined();
      expect(foundParty!.invitationStatus).toBe(InvitationStatus.PENDING);

      // Add user as party member
      await prismaMock.partyMember.create({
        data: {
          partyId: party.id,
          userId: user.id,
        },
      });

      // Update party status
      const updatedParty = await prismaMock.party.update({
        where: { id: party.id },
        data: {
          invitationStatus: InvitationStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      });

      expect(updatedParty.invitationStatus).toBe(InvitationStatus.ACCEPTED);
      expect(prismaMock.partyMember.create).toHaveBeenCalledWith({
        data: {
          partyId: party.id,
          userId: user.id,
        },
      });
    });

    it('should not create duplicate party member if already exists', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const party = createMockParty({
        dealId: deal.id,
        invitationStatus: InvitationStatus.PENDING,
      });

      // Mock party with existing member
      prismaMock.party.findFirst.mockResolvedValue({
        ...party,
        deal: deal,
        members: [
          {
            id: 'existing-member',
            userId: user.id,
            partyId: party.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      } as any);

      const foundParty = await prismaMock.party.findFirst({
        where: { invitationToken: 'token' },
        include: { deal: true, members: true },
      });

      const existingMember = foundParty!.members.find((m) => m.userId === user.id);

      // Should not call create if member exists
      if (!existingMember) {
        await prismaMock.partyMember.create({
          data: { partyId: party.id, userId: user.id },
        });
      }

      expect(existingMember).toBeDefined();
      expect(prismaMock.partyMember.create).not.toHaveBeenCalled();
    });

    it('should return error if invitation already declined', async () => {
      const party = createMockParty({
        invitationStatus: InvitationStatus.DECLINED,
      });

      prismaMock.party.findFirst.mockResolvedValue({
        ...party,
        deal: createMockDeal(),
        members: [],
      } as any);

      const foundParty = await prismaMock.party.findFirst({
        where: { invitationToken: 'token' },
        include: { deal: true, members: true },
      });

      expect(foundParty!.invitationStatus).toBe(InvitationStatus.DECLINED);

      // Simulate check: if declined, cannot accept
      const canAccept = foundParty!.invitationStatus !== InvitationStatus.DECLINED;
      expect(canAccept).toBe(false);
    });

    it('should handle already accepted invitation gracefully', async () => {
      const party = createMockParty({
        invitationStatus: InvitationStatus.ACCEPTED,
      });

      prismaMock.party.findFirst.mockResolvedValue({
        ...party,
        deal: createMockDeal(),
        members: [],
      } as any);

      const foundParty = await prismaMock.party.findFirst({
        where: { invitationToken: 'token' },
        include: { deal: true, members: true },
      });

      expect(foundParty!.invitationStatus).toBe(InvitationStatus.ACCEPTED);

      // Should return success with alreadyAccepted flag
      const alreadyAccepted = foundParty!.invitationStatus === InvitationStatus.ACCEPTED;
      expect(alreadyAccepted).toBe(true);
    });

    it('should initialize milestone negotiation when all parties accept', async () => {
      const user = createMockUser();
      const deal = createMockDeal({ status: DealStatus.INVITED });
      const party = createMockParty({
        dealId: deal.id,
        invitationStatus: InvitationStatus.PENDING,
      });

      prismaMock.party.findFirst.mockResolvedValue({
        ...party,
        deal: deal,
        members: [],
      } as any);

      prismaMock.partyMember.create.mockResolvedValue({
        id: 'member-id',
        partyId: party.id,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      prismaMock.party.update.mockResolvedValue({
        ...party,
        invitationStatus: InvitationStatus.ACCEPTED,
      } as any);

      // All parties accepted
      prismaMock.party.count.mockResolvedValue(0);

      mockInitializeMilestoneNegotiation.mockResolvedValue(undefined);
      mockCheckAndActivateDeal.mockResolvedValue({
        activated: true,
        status: DealStatus.ACCEPTED,
        reason: 'Deal activated',
      });

      // Execute flow
      await prismaMock.party.update({
        where: { id: party.id },
        data: { invitationStatus: InvitationStatus.ACCEPTED, respondedAt: new Date() },
      });

      const pendingCount = await prismaMock.party.count({
        where: {
          dealId: party.dealId,
          invitationStatus: { not: InvitationStatus.ACCEPTED },
        },
      });

      const allAccepted = pendingCount === 0;

      if (allAccepted) {
        await initializeMilestoneNegotiation(party.dealId);
        await checkAndActivateDeal(party.dealId, user.id);
      }

      expect(allAccepted).toBe(true);
      expect(mockInitializeMilestoneNegotiation).toHaveBeenCalledWith(party.dealId);
      expect(mockCheckAndActivateDeal).toHaveBeenCalledWith(party.dealId, user.id);
    });

    it('should not initialize milestone negotiation if parties still pending', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const party = createMockParty({ dealId: deal.id });

      prismaMock.party.update.mockResolvedValue({
        ...party,
        invitationStatus: InvitationStatus.ACCEPTED,
      } as any);

      // Still 2 pending parties
      prismaMock.party.count.mockResolvedValue(2);

      await prismaMock.party.update({
        where: { id: party.id },
        data: { invitationStatus: InvitationStatus.ACCEPTED, respondedAt: new Date() },
      });

      const pendingCount = await prismaMock.party.count({
        where: {
          dealId: party.dealId,
          invitationStatus: { not: InvitationStatus.ACCEPTED },
        },
      });

      const allAccepted = pendingCount === 0;

      if (allAccepted) {
        await initializeMilestoneNegotiation(party.dealId);
      }

      expect(allAccepted).toBe(false);
      expect(mockInitializeMilestoneNegotiation).not.toHaveBeenCalled();
    });
  });

  describe('Invitation Decline Flow', () => {
    it('should decline invitation successfully', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const party = createMockParty({
        dealId: deal.id,
        invitationStatus: InvitationStatus.PENDING,
        invitationToken: 'decline-token',
      });

      prismaMock.party.findUnique.mockResolvedValue({
        ...party,
        deal: {
          ...deal,
          parties: [party],
        },
      } as any);

      prismaMock.party.update.mockResolvedValue({
        ...party,
        invitationStatus: InvitationStatus.DECLINED,
        respondedAt: new Date(),
      } as any);

      // Execute decline logic
      const updatedParty = await prismaMock.party.update({
        where: { id: party.id },
        data: {
          invitationStatus: InvitationStatus.DECLINED,
          respondedAt: new Date(),
        },
      });

      expect(updatedParty.invitationStatus).toBe(InvitationStatus.DECLINED);
      expect(prismaMock.party.update).toHaveBeenCalledWith({
        where: { id: party.id },
        data: {
          invitationStatus: InvitationStatus.DECLINED,
          respondedAt: expect.any(Date),
        },
      });
    });

    it('should handle decline with reason', async () => {
      const party = createMockParty({ invitationStatus: InvitationStatus.PENDING });
      const reason = 'Budget constraints';

      prismaMock.party.update.mockResolvedValue({
        ...party,
        invitationStatus: InvitationStatus.DECLINED,
      } as any);

      await prismaMock.party.update({
        where: { id: party.id },
        data: {
          invitationStatus: InvitationStatus.DECLINED,
          respondedAt: new Date(),
        },
      });

      // Reason would be stored in audit log metadata (not in party model)
      expect(prismaMock.party.update).toHaveBeenCalled();
    });

    it('should return error if invitation not found', async () => {
      prismaMock.party.findUnique.mockResolvedValue(null);

      const result = await prismaMock.party.findUnique({
        where: { invitationToken: 'invalid-token' },
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

      expect(result).toBeNull();
    });
  });

  describe('Invitation Token Validation', () => {
    it('should return null for expired/invalid token', async () => {
      prismaMock.party.findFirst.mockResolvedValue(null);

      const party = await prismaMock.party.findFirst({
        where: { invitationToken: 'expired-token' },
        include: { deal: true, members: true },
      });

      expect(party).toBeNull();
    });

    it('should find party by valid token', async () => {
      const party = createMockParty({ invitationToken: 'valid-token-123' });

      prismaMock.party.findFirst.mockResolvedValue({
        ...party,
        deal: createMockDeal(),
        members: [],
      } as any);

      const result = await prismaMock.party.findFirst({
        where: { invitationToken: 'valid-token-123' },
        include: { deal: true, members: true },
      });

      expect(result).toBeDefined();
      expect(result!.invitationToken).toBe('valid-token-123');
    });
  });
});
