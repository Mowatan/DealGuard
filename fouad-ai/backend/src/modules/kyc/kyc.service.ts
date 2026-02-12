import { prisma } from '../../lib/prisma';
import { storage } from '../../lib/storage';
import { createAuditLog } from '../../lib/audit';
import { KYCStatus } from '@prisma/client';

// ============================================================================
// KYC DOCUMENT UPLOAD
// ============================================================================

export async function uploadKYCDocument(
  partyId: string,
  file: Buffer,
  filename: string,
  mimeType: string,
  uploadedBy: string
) {
  // Verify party exists
  const party = await prisma.party.findUnique({
    where: { id: partyId },
  });

  if (!party) {
    throw new Error('Party not found');
  }

  // Upload document to storage
  const result = await storage.uploadDocument(file, filename, mimeType);

  // Add document URL to party's kycDocumentUrls array
  const updatedParty = await prisma.party.update({
    where: { id: partyId },
    data: {
      kycDocumentUrls: {
        push: result.key,
      },
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: party.dealId,
    eventType: 'KYC_DOCUMENT_UPLOADED',
    actor: uploadedBy,
    entityType: 'Party',
    entityId: partyId,
    newState: {
      documentUrl: result.key,
      filename,
    },
  });

  return {
    party: updatedParty,
    documentUrl: result.key,
  };
}

// ============================================================================
// SUBMIT KYC FOR VERIFICATION
// ============================================================================

export async function submitForVerification(partyId: string, actorId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
  });

  if (!party) {
    throw new Error('Party not found');
  }

  // Check if already submitted or verified
  if (party.kycStatus === KYCStatus.PENDING) {
    throw new Error('KYC already submitted for verification');
  }

  if (party.kycStatus === KYCStatus.VERIFIED) {
    throw new Error('KYC already verified');
  }

  // Validate required documents are present
  if (!party.kycDocumentUrls || party.kycDocumentUrls.length === 0) {
    throw new Error('No KYC documents uploaded');
  }

  // Update status to PENDING
  const updatedParty = await prisma.party.update({
    where: { id: partyId },
    data: {
      kycStatus: KYCStatus.PENDING,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: party.dealId,
    eventType: 'KYC_SUBMITTED_FOR_VERIFICATION',
    actor: actorId,
    entityType: 'Party',
    entityId: partyId,
    oldState: { kycStatus: party.kycStatus },
    newState: { kycStatus: KYCStatus.PENDING },
  });

  return updatedParty;
}

// ============================================================================
// VERIFY KYC (ADMIN)
// ============================================================================

export async function verifyKYC(
  partyId: string,
  reviewedBy: string,
  notes?: string
) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
  });

  if (!party) {
    throw new Error('Party not found');
  }

  if (party.kycStatus !== KYCStatus.PENDING) {
    throw new Error('KYC is not pending verification');
  }

  // Update status to VERIFIED
  const updatedParty = await prisma.party.update({
    where: { id: partyId },
    data: {
      kycStatus: KYCStatus.VERIFIED,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: party.dealId,
    eventType: 'KYC_VERIFIED',
    actor: reviewedBy,
    entityType: 'Party',
    entityId: partyId,
    oldState: { kycStatus: party.kycStatus },
    newState: { kycStatus: KYCStatus.VERIFIED },
    metadata: { notes },
  });

  return updatedParty;
}

// ============================================================================
// REJECT KYC (ADMIN)
// ============================================================================

export async function rejectKYC(
  partyId: string,
  reviewedBy: string,
  rejectionReason: string
) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
  });

  if (!party) {
    throw new Error('Party not found');
  }

  if (party.kycStatus !== KYCStatus.PENDING) {
    throw new Error('KYC is not pending verification');
  }

  // Update status to REJECTED
  const updatedParty = await prisma.party.update({
    where: { id: partyId },
    data: {
      kycStatus: KYCStatus.REJECTED,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: party.dealId,
    eventType: 'KYC_REJECTED',
    actor: reviewedBy,
    entityType: 'Party',
    entityId: partyId,
    oldState: { kycStatus: party.kycStatus },
    newState: { kycStatus: KYCStatus.REJECTED },
    metadata: { rejectionReason },
  });

  return updatedParty;
}

// ============================================================================
// GET KYC STATUS
// ============================================================================

export async function getKYCStatus(partyId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: {
      id: true,
      name: true,
      partyType: true,
      idType: true,
      idNumber: true,
      kycStatus: true,
      kycDocumentUrls: true,
      contactEmail: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!party) {
    throw new Error('Party not found');
  }

  return party;
}

// ============================================================================
// LIST PENDING KYC REVIEWS
// ============================================================================

export async function listPendingKYC() {
  return prisma.party.findMany({
    where: {
      kycStatus: KYCStatus.PENDING,
    },
    include: {
      deal: {
        select: {
          id: true,
          dealNumber: true,
          title: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'asc', // Oldest first
    },
  });
}

// ============================================================================
// GET KYC DOCUMENT URLs WITH PRESIGNED ACCESS
// ============================================================================

export async function getKYCDocumentUrls(partyId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: {
      kycDocumentUrls: true,
    },
  });

  if (!party) {
    throw new Error('Party not found');
  }

  // Generate presigned URLs for each document
  const urlsWithAccess = await Promise.all(
    party.kycDocumentUrls.map(async (docKey) => {
      // Extract bucket and key from the stored path (format: "bucket/key")
      const [bucket, ...keyParts] = docKey.split('/');
      const key = keyParts.join('/');

      try {
        const url = await storage.getFileUrl(bucket, key, 3600); // 1 hour expiry
        return {
          key: docKey,
          url,
        };
      } catch (error) {
        console.error(`Failed to generate URL for ${docKey}:`, error);
        return {
          key: docKey,
          url: null,
        };
      }
    })
  );

  return urlsWithAccess;
}
