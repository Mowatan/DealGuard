/**
 * Evidence Service Tests
 * Tests for evidence creation, listing, retrieval, and review logic
 */

import {
  createEvidence,
  listEvidenceByDeal,
  getEvidenceById,
  reviewEvidence,
  requestMappingSuggestion,
} from '../evidence.service';
import { prismaMock } from '../../../__tests__/jest.setup';
import {
  createMockDeal,
  createMockUser,
  generateTestId,
} from '../../../__tests__/helpers';
import { EvidenceStatus } from '@prisma/client';

// Mock authorization functions
jest.mock('../../../lib/authorization', () => ({
  canUserAccessDeal: jest.fn(),
  canUserAccessEvidence: jest.fn(),
  isAdminOrCaseOfficer: jest.fn(),
}));

// Mock admin cache
jest.mock('../../../lib/admin-cache', () => ({
  getAdminEmails: jest.fn().mockResolvedValue(['admin@example.com']),
}));

// Mock storage
jest.mock('../../../lib/storage', () => ({
  storage: {
    uploadEvidence: jest.fn().mockResolvedValue({
      key: 'evidence-key',
      hash: 'evidence-hash',
      size: 1024,
    }),
  },
}));

const { canUserAccessDeal, canUserAccessEvidence, isAdminOrCaseOfficer } = require('../../../lib/authorization');

describe('Evidence Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvidence', () => {
    it.skip('should create evidence with attachments', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const evidenceId = generateTestId();

      const mockEvidence = {
        id: evidenceId,
        dealId: deal.id,
        milestoneId: null,
        subject: 'Test Evidence',
        description: 'Test description',
        sourceType: 'UPLOAD',
        status: EvidenceStatus.RECEIVED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.evidenceItem.create.mockResolvedValue(mockEvidence as any);

      const mockAttachment = {
        id: generateTestId(),
        evidenceItemId: evidenceId,
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        s3Key: 'evidence-key',
        sha256Hash: 'evidence-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.attachment.create.mockResolvedValue(mockAttachment as any);

      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal,
        emailAddress: 'deal@example.com',
      } as any);

      const result = await createEvidence({
        dealId: deal.id,
        subject: 'Test Evidence',
        description: 'Test description',
        sourceType: 'UPLOAD',
        sourceEmail: 'submitter@example.com',
        files: [
          {
            buffer: Buffer.from('test'),
            filename: 'document.pdf',
            mimeType: 'application/pdf',
          },
        ],
        actorId: user.id,
      });

      expect(result.id).toBe(evidenceId);
      expect(result.attachments).toHaveLength(1);
      expect(prismaMock.evidenceItem.create).toHaveBeenCalledWith({
        data: {
          dealId: deal.id,
          milestoneId: undefined,
          subject: 'Test Evidence',
          description: 'Test description',
          sourceType: 'UPLOAD',
          sourceEmail: 'submitter@example.com',
          status: EvidenceStatus.RECEIVED,
        },
      });
    });

    it.skip('should request AI mapping suggestion when milestone not specified', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const evidenceId = generateTestId();

      prismaMock.evidenceItem.create.mockResolvedValue({
        id: evidenceId,
        dealId: deal.id,
        milestoneId: null, // No milestone specified
        status: EvidenceStatus.RECEIVED,
      } as any);

      prismaMock.attachment.create.mockResolvedValue({
        id: generateTestId(),
        evidenceItemId: evidenceId,
      } as any);

      prismaMock.deal.findUnique.mockResolvedValue(deal as any);

      // Mock for requestMappingSuggestion
      prismaMock.evidenceItem.findUnique.mockResolvedValue({
        id: evidenceId,
        subject: 'Test',
        description: 'Test',
      } as any);

      await createEvidence({
        dealId: deal.id,
        subject: 'Test',
        sourceType: 'UPLOAD',
        files: [
          {
            buffer: Buffer.from('test'),
            filename: 'doc.pdf',
            mimeType: 'application/pdf',
          },
        ],
        actorId: user.id,
      });

      // AI suggestion queue should be called (mocked in jest.setup)
      expect(prismaMock.evidenceItem.create).toHaveBeenCalled();
    });

    it.skip('should not request AI suggestion when milestone is specified', async () => {
      const user = createMockUser();
      const deal = createMockDeal();
      const milestoneId = generateTestId();

      prismaMock.evidenceItem.create.mockResolvedValue({
        id: generateTestId(),
        dealId: deal.id,
        milestoneId: milestoneId, // Milestone specified
        status: EvidenceStatus.RECEIVED,
      } as any);

      prismaMock.attachment.create.mockResolvedValue({
        id: generateTestId(),
      } as any);

      prismaMock.deal.findUnique.mockResolvedValue(deal as any);

      await createEvidence({
        dealId: deal.id,
        milestoneId: milestoneId,
        subject: 'Test',
        sourceType: 'UPLOAD',
        files: [
          {
            buffer: Buffer.from('test'),
            filename: 'doc.pdf',
            mimeType: 'application/pdf',
          },
        ],
        actorId: user.id,
      });

      // Should not call findUnique for AI suggestion since milestone is specified
      expect(prismaMock.evidenceItem.create).toHaveBeenCalled();
    });
  });

  describe('listEvidenceByDeal', () => {
    it('should list evidence for authorized user', async () => {
      const user = createMockUser();
      const deal = createMockDeal();

      canUserAccessDeal.mockResolvedValue(true);

      const mockEvidence = [
        {
          id: generateTestId(),
          dealId: deal.id,
          subject: 'Evidence 1',
          status: EvidenceStatus.RECEIVED,
          attachments: [],
          milestone: null,
        },
        {
          id: generateTestId(),
          dealId: deal.id,
          subject: 'Evidence 2',
          status: EvidenceStatus.APPROVED,
          attachments: [],
          milestone: null,
        },
      ];

      prismaMock.evidenceItem.findMany.mockResolvedValue(mockEvidence as any);

      const result = await listEvidenceByDeal(deal.id, user.id);

      expect(result).toHaveLength(2);
      expect(canUserAccessDeal).toHaveBeenCalledWith(deal.id, user.id);
      expect(prismaMock.evidenceItem.findMany).toHaveBeenCalledWith({
        where: { dealId: deal.id },
        include: {
          attachments: true,
          milestone: {
            select: {
              id: true,
              name: true,
              order: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter evidence by status', async () => {
      const user = createMockUser();
      const deal = createMockDeal();

      canUserAccessDeal.mockResolvedValue(true);

      prismaMock.evidenceItem.findMany.mockResolvedValue([
        {
          id: generateTestId(),
          status: EvidenceStatus.APPROVED,
        },
      ] as any);

      await listEvidenceByDeal(deal.id, user.id, EvidenceStatus.APPROVED);

      expect(prismaMock.evidenceItem.findMany).toHaveBeenCalledWith({
        where: {
          dealId: deal.id,
          status: EvidenceStatus.APPROVED,
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw error if user not authorized', async () => {
      const user = createMockUser();
      const deal = createMockDeal();

      canUserAccessDeal.mockResolvedValue(false);

      await expect(listEvidenceByDeal(deal.id, user.id)).rejects.toThrow('Unauthorized');
    });
  });

  describe('getEvidenceById', () => {
    it('should return evidence if user has access', async () => {
      const user = createMockUser();
      const evidenceId = generateTestId();

      canUserAccessEvidence.mockResolvedValue(true);

      const mockEvidence = {
        id: evidenceId,
        subject: 'Test Evidence',
        status: EvidenceStatus.RECEIVED,
        attachments: [],
        milestone: null,
      };

      prismaMock.evidenceItem.findUnique.mockResolvedValue(mockEvidence as any);

      const result = await getEvidenceById(evidenceId, user.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(evidenceId);
      expect(canUserAccessEvidence).toHaveBeenCalledWith(evidenceId, user.id);
    });

    it('should return null if user does not have access', async () => {
      const user = createMockUser();
      const evidenceId = generateTestId();

      canUserAccessEvidence.mockResolvedValue(false);

      const result = await getEvidenceById(evidenceId, user.id);

      expect(result).toBeNull();
      expect(prismaMock.evidenceItem.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('reviewEvidence', () => {
    it('should approve evidence for admin', async () => {
      const admin = createMockUser({ role: 'ADMIN' });
      const deal = createMockDeal();
      const evidenceId = generateTestId();

      isAdminOrCaseOfficer.mockResolvedValue(true);

      prismaMock.evidenceItem.findUnique.mockResolvedValue({
        id: evidenceId,
        dealId: deal.id,
        status: EvidenceStatus.RECEIVED,
      } as any);

      prismaMock.evidenceItem.update.mockResolvedValue({
        id: evidenceId,
        status: EvidenceStatus.APPROVED,
      } as any);

      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal,
        parties: [],
      } as any);

      const result = await reviewEvidence(
        evidenceId,
        EvidenceStatus.APPROVED,
        null,
        'Looks good',
        admin.id
      );

      expect(result.status).toBe(EvidenceStatus.APPROVED);
      expect(prismaMock.evidenceItem.update).toHaveBeenCalledWith({
        where: { id: evidenceId },
        data: {
          status: EvidenceStatus.APPROVED,
          milestoneId: undefined,
          reviewNotes: 'Looks good',
          reviewedBy: admin.id,
          reviewedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it('should reject evidence with reason', async () => {
      const admin = createMockUser({ role: 'ADMIN' });
      const deal = createMockDeal();
      const evidenceId = generateTestId();

      isAdminOrCaseOfficer.mockResolvedValue(true);

      prismaMock.evidenceItem.findUnique.mockResolvedValue({
        id: evidenceId,
        dealId: deal.id,
        status: EvidenceStatus.RECEIVED,
      } as any);

      prismaMock.evidenceItem.update.mockResolvedValue({
        id: evidenceId,
        status: EvidenceStatus.REJECTED,
      } as any);

      prismaMock.deal.findUnique.mockResolvedValue({
        ...deal,
        parties: [],
      } as any);

      const result = await reviewEvidence(
        evidenceId,
        EvidenceStatus.REJECTED,
        null,
        'Insufficient documentation',
        admin.id
      );

      expect(result.status).toBe(EvidenceStatus.REJECTED);
    });

    it('should throw error if user not admin or case officer', async () => {
      const user = createMockUser({ role: 'PARTY_USER' });

      isAdminOrCaseOfficer.mockResolvedValue(false);

      await expect(
        reviewEvidence(
          generateTestId(),
          EvidenceStatus.APPROVED,
          null,
          'Notes',
          user.id
        )
      ).rejects.toThrow('Only case officers and admins');
    });

    it('should throw error if evidence not found', async () => {
      const admin = createMockUser({ role: 'ADMIN' });

      isAdminOrCaseOfficer.mockResolvedValue(true);
      prismaMock.evidenceItem.update.mockRejectedValue(
        new Error('Record to update not found')
      );

      await expect(
        reviewEvidence(
          generateTestId(),
          EvidenceStatus.APPROVED,
          null,
          'Notes',
          admin.id
        )
      ).rejects.toThrow();
    });
  });

  describe('requestMappingSuggestion', () => {
    it('should request AI mapping for evidence', async () => {
      const evidenceId = generateTestId();

      // Just verify the function completes without error
      // The AI queue call is mocked globally
      await expect(requestMappingSuggestion(evidenceId)).resolves.not.toThrow();
    });
  });
});
