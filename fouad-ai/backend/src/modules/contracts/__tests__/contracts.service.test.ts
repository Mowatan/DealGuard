/**
 * Contracts Service Tests
 * Tests for contract creation, versioning, acceptance, and document management
 */

import {
  createContractVersion,
  getContractById,
  uploadPhysicalDocument,
  acceptContract,
  checkAcceptanceStatus,
} from '../contracts.service';
import { prismaMock } from '../../../__tests__/jest.setup';
import {
  createMockDeal,
  createMockParty,
  createMockContract,
  createMockMilestone,
  createMockUser,
} from '../../../__tests__/helpers';

// Mock authorization functions
jest.mock('../../../lib/authorization', () => ({
  canUserAccessContract: jest.fn(),
  isUserPartyMember: jest.fn(),
}));

// Mock storage
jest.mock('../../../lib/storage', () => ({
  storage: {
    uploadDocument: jest.fn().mockResolvedValue({ key: 'mock-document-key', hash: 'mock-hash-123' }),
  },
}));

const { canUserAccessContract, isUserPartyMember } = require('../../../lib/authorization');

describe('Contracts Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createContractVersion', () => {
    it('should create first version of contract', async () => {
      const user = createMockUser();
      const deal = createMockDeal();

      // No existing contracts
      prismaMock.contract.findFirst.mockResolvedValue(null);

      const mockContract = createMockContract({ dealId: deal.id, version: 1 });

      prismaMock.contract.create.mockResolvedValue({
        ...mockContract,
        milestones: [],
      } as any);

      const result = await createContractVersion(
        {
          dealId: deal.id,
          termsJson: { terms: 'test terms' },
        },
        user.id
      );

      expect(result.version).toBe(1);
      expect(prismaMock.contract.create).toHaveBeenCalledWith({
        data: {
          dealId: deal.id,
          version: 1,
          termsJson: { terms: 'test terms' },
          milestones: undefined,
        },
        include: {
          milestones: true,
        },
      });
    });

    it('should increment version for subsequent contracts', async () => {
      const user = createMockUser();
      const deal = createMockDeal();

      // Existing contract with version 1
      const existingContract = createMockContract({ dealId: deal.id, version: 1 });
      prismaMock.contract.findFirst.mockResolvedValue(existingContract as any);

      const newContract = createMockContract({ dealId: deal.id, version: 2 });
      prismaMock.contract.create.mockResolvedValue({
        ...newContract,
        milestones: [],
      } as any);

      const result = await createContractVersion(
        {
          dealId: deal.id,
          termsJson: { terms: 'updated terms' },
        },
        user.id
      );

      expect(result.version).toBe(2);
    });

    it('should create contract with milestones', async () => {
      const user = createMockUser();
      const deal = createMockDeal();

      prismaMock.contract.findFirst.mockResolvedValue(null);

      const milestones = [
        {
          title: 'First Payment',
          description: 'Initial milestone',
          order: 1,
          releaseAmount: 5000,
          currency: 'USD',
          deadline: '2026-12-31',
        },
        {
          title: 'Second Payment',
          order: 2,
          releaseAmount: 10000,
          currency: 'USD',
        },
      ];

      const mockMilestone1 = createMockMilestone({ title: 'First Payment', order: 1 });
      const mockMilestone2 = createMockMilestone({ title: 'Second Payment', order: 2 });

      prismaMock.contract.create.mockResolvedValue({
        ...createMockContract({ dealId: deal.id, version: 1 }),
        milestones: [mockMilestone1, mockMilestone2],
      } as any);

      const result = await createContractVersion(
        {
          dealId: deal.id,
          termsJson: { terms: 'test' },
          milestones,
        },
        user.id
      );

      expect(result.milestones).toHaveLength(2);
      expect(result.milestones[0].title).toBe('First Payment');
    });
  });

  describe('getContractById', () => {
    it('should return contract if user has access', async () => {
      const user = createMockUser();
      const contract = createMockContract();

      canUserAccessContract.mockResolvedValue(true);

      prismaMock.contract.findUnique.mockResolvedValue({
        ...contract,
        milestones: [],
        acceptances: [],
        deal: createMockDeal(),
      } as any);

      const result = await getContractById(contract.id, user.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(contract.id);
      expect(canUserAccessContract).toHaveBeenCalledWith(contract.id, user.id);
    });

    it('should return null if user does not have access', async () => {
      const user = createMockUser();
      const contract = createMockContract();

      canUserAccessContract.mockResolvedValue(false);

      const result = await getContractById(contract.id, user.id);

      expect(result).toBeNull();
      expect(prismaMock.contract.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('uploadPhysicalDocument', () => {
    it.skip('should upload document for authorized user', async () => {
      const user = createMockUser();
      const contract = createMockContract();
      const buffer = Buffer.from('test document');

      canUserAccessContract.mockResolvedValue(true);

      prismaMock.contract.findUnique.mockResolvedValue(contract as any);

      prismaMock.contract.update.mockResolvedValue({
        ...contract,
        physicalDocumentUrl: 'document-key',
        physicalDocumentHash: 'hash123',
      } as any);

      const result = await uploadPhysicalDocument(
        contract.id,
        buffer,
        'contract.pdf',
        'application/pdf',
        user.id
      );

      expect(result.physicalDocumentUrl).toBe('document-key');
      expect(result.physicalDocumentHash).toBe('hash123');
    });

    it('should throw error if user not authorized', async () => {
      const user = createMockUser();
      const contract = createMockContract();
      const buffer = Buffer.from('test');

      canUserAccessContract.mockResolvedValue(false);

      await expect(
        uploadPhysicalDocument(contract.id, buffer, 'doc.pdf', 'application/pdf', user.id)
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw error if contract not found', async () => {
      const user = createMockUser();
      const buffer = Buffer.from('test');

      canUserAccessContract.mockResolvedValue(true);
      prismaMock.contract.findUnique.mockResolvedValue(null);

      await expect(
        uploadPhysicalDocument('non-existent', buffer, 'doc.pdf', 'application/pdf', user.id)
      ).rejects.toThrow('Contract not found');
    });
  });

  describe('acceptContract', () => {
    it('should accept contract for authorized party member', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const party = createMockParty({ dealId: deal.id });
      const contract = createMockContract({ dealId: deal.id });

      prismaMock.contract.findUnique.mockResolvedValue({
        ...contract,
        termsJson: { terms: 'test terms' },
        deal: {
          ...deal,
          parties: [party],
        },
      } as any);

      isUserPartyMember.mockResolvedValue(true);

      prismaMock.contractAcceptance.findUnique.mockResolvedValue(null);

      const mockAcceptance = {
        id: 'acceptance-id',
        contractId: contract.id,
        partyId: party.id,
        acceptedAt: new Date(),
      };

      prismaMock.contractAcceptance.create.mockResolvedValue(mockAcceptance as any);

      prismaMock.contractAcceptance.count.mockResolvedValue(1);

      const result = await acceptContract(contract.id, party.id, user.id);

      expect(result).toBeDefined();
      expect(result.contractId).toBe(contract.id);
      expect(prismaMock.contractAcceptance.create).toHaveBeenCalledWith({
        data: {
          contractId: contract.id,
          partyId: party.id,
        },
      });
    });

    it('should throw error if user not party member', async () => {
      const user = createMockUser();
      const contract = createMockContract();
      const party = createMockParty();

      prismaMock.contract.findUnique.mockResolvedValue({
        ...contract,
        deal: createMockDeal(),
      } as any);

      isUserPartyMember.mockResolvedValue(false);

      await expect(acceptContract(contract.id, party.id, user.id)).rejects.toThrow(
        'not a member of this party'
      );
    });

    it('should throw error if already accepted', async () => {
      const user = createMockUser();
      const contract = createMockContract();
      const party = createMockParty();

      prismaMock.contract.findUnique.mockResolvedValue({
        ...contract,
        deal: createMockDeal(),
      } as any);

      isUserPartyMember.mockResolvedValue(true);

      prismaMock.contractAcceptance.findUnique.mockResolvedValue({
        id: 'existing',
        contractId: contract.id,
        partyId: party.id,
      } as any);

      await expect(acceptContract(contract.id, party.id, user.id)).rejects.toThrow(
        'already accepted'
      );
    });

    it('should mark contract as effective when all parties accept', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const party1 = createMockParty({ dealId: deal.id });
      const party2 = createMockParty({ dealId: deal.id });
      const contract = createMockContract({ dealId: deal.id });

      prismaMock.contract.findUnique.mockResolvedValue({
        ...contract,
        termsJson: { terms: 'test contract terms' },
        deal: {
          ...deal,
          parties: [party1, party2],
        },
      } as any);

      isUserPartyMember.mockResolvedValue(true);
      prismaMock.contractAcceptance.findUnique.mockResolvedValue(null);

      prismaMock.contractAcceptance.create.mockResolvedValue({
        id: 'acceptance-id',
        contractId: contract.id,
        partyId: party2.id,
      } as any);

      // All parties accepted (count = 2)
      prismaMock.contractAcceptance.count.mockResolvedValue(2);

      prismaMock.contract.update.mockResolvedValue({
        ...contract,
        isEffective: true,
        effectiveAt: new Date(),
      } as any);

      await acceptContract(contract.id, party2.id, user.id);

      expect(prismaMock.contract.update).toHaveBeenCalledWith({
        where: { id: contract.id },
        data: {
          isEffective: true,
          effectiveAt: expect.any(Date),
        },
      });
    });

    it('should throw error if contract not found', async () => {
      prismaMock.contract.findUnique.mockResolvedValue(null);

      await expect(acceptContract('non-existent', 'party-id', 'user-id')).rejects.toThrow(
        'Contract not found'
      );
    });
  });

  describe('checkAcceptanceStatus', () => {
    it('should return acceptance status for authorized user', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const party1 = createMockParty({ dealId: deal.id });
      const party2 = createMockParty({ dealId: deal.id });
      const party3 = createMockParty({ dealId: deal.id });
      const contract = createMockContract({ dealId: deal.id });

      canUserAccessContract.mockResolvedValue(true);

      prismaMock.contract.findUnique.mockResolvedValue({
        ...contract,
        deal: {
          ...deal,
          parties: [party1, party2, party3],
        },
        acceptances: [
          { id: 'acc1', contractId: contract.id, partyId: party1.id, party: party1 },
          { id: 'acc2', contractId: contract.id, partyId: party2.id, party: party2 },
        ],
      } as any);

      const result = await checkAcceptanceStatus(contract.id, user.id);

      expect(result.isFullyAccepted).toBe(false);
      expect(result.requiredParties).toBe(3);
      expect(result.acceptedCount).toBe(2);
      expect(result.pendingParties).toHaveLength(1);
      expect(result.pendingParties[0].id).toBe(party3.id);
    });

    it('should indicate fully accepted when all parties accepted', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const party1 = createMockParty({ dealId: deal.id });
      const party2 = createMockParty({ dealId: deal.id });
      const contract = createMockContract({ dealId: deal.id });

      canUserAccessContract.mockResolvedValue(true);

      prismaMock.contract.findUnique.mockResolvedValue({
        ...contract,
        deal: {
          ...deal,
          parties: [party1, party2],
        },
        acceptances: [
          { id: 'acc1', contractId: contract.id, partyId: party1.id, party: party1 },
          { id: 'acc2', contractId: contract.id, partyId: party2.id, party: party2 },
        ],
      } as any);

      const result = await checkAcceptanceStatus(contract.id, user.id);

      expect(result.isFullyAccepted).toBe(true);
      expect(result.pendingParties).toHaveLength(0);
    });

    it('should throw error if user not authorized', async () => {
      const user = createMockUser();
      const contract = createMockContract();

      canUserAccessContract.mockResolvedValue(false);

      await expect(checkAcceptanceStatus(contract.id, user.id)).rejects.toThrow('Unauthorized');
    });

    it('should throw error if contract not found', async () => {
      const user = createMockUser();

      canUserAccessContract.mockResolvedValue(true);
      prismaMock.contract.findUnique.mockResolvedValue(null);

      await expect(checkAcceptanceStatus('non-existent', user.id)).rejects.toThrow(
        'Contract not found'
      );
    });
  });
});
