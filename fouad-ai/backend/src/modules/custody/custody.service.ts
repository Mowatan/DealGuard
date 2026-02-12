import { prisma } from '../../lib/prisma';
import { storage } from '../../lib/storage';
import { createAuditLog } from '../../lib/audit';
import { blockchainAnchorQueue } from '../../lib/queue';
import { CustodyStatus } from '@prisma/client';
import { createHash } from 'crypto';

interface SubmitFundingProofParams {
  dealId: string;
  amount: number;
  currency: string;
  proofFile: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  };
  actorId: string;
}

export async function submitFundingProof(params: SubmitFundingProofParams) {
  // Upload proof to storage
  const result = await storage.uploadEvidence(
    params.proofFile.buffer,
    params.proofFile.filename,
    params.proofFile.mimeType
  );

  const record = await prisma.custodyRecord.create({
    data: {
      dealId: params.dealId,
      amount: params.amount,
      currency: params.currency,
      status: CustodyStatus.FUNDING_SUBMITTED,
      fundingProofUrl: result.key,
      fundingProofHash: result.hash,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: params.dealId,
    eventType: 'FUNDING_PROOF_SUBMITTED',
    actor: params.actorId,
    entityType: 'CustodyRecord',
    entityId: record.id,
    newState: {
      amount: params.amount.toString(),
      status: CustodyStatus.FUNDING_SUBMITTED,
    },
  });

  return record;
}

export async function verifyFunding(recordId: string, verifiedBy: string) {
  const record = await prisma.custodyRecord.update({
    where: { id: recordId },
    data: {
      status: CustodyStatus.FUNDING_VERIFIED,
      fundingVerifiedAt: new Date(),
      fundingVerifiedBy: verifiedBy,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: record.dealId,
    eventType: 'FUNDING_VERIFIED',
    actor: verifiedBy,
    entityType: 'CustodyRecord',
    entityId: recordId,
    newState: {
      status: CustodyStatus.FUNDING_VERIFIED,
    },
  });

  // Queue blockchain anchor
  const dataHash = createHash('sha256')
    .update(JSON.stringify({
      recordId,
      amount: record.amount.toString(),
      currency: record.currency,
      verifiedAt: new Date().toISOString(),
    }))
    .digest('hex');

  await blockchainAnchorQueue.add('anchor-funding', {
    dealId: record.dealId,
    eventType: 'funding_verified',
    eventId: recordId,
    dataHash,
  });

  return record;
}

export async function authorizeAction(
  recordId: string,
  action: 'RELEASE' | 'RETURN',
  authorizedBy: string
) {
  const newStatus =
    action === 'RELEASE'
      ? CustodyStatus.RELEASE_AUTHORIZED
      : CustodyStatus.RETURN_AUTHORIZED;

  const record = await prisma.custodyRecord.update({
    where: { id: recordId },
    data: {
      status: newStatus,
      authorizedAction: action,
      authorizedAt: new Date(),
      authorizedBy,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: record.dealId,
    eventType: `${action}_AUTHORIZED`,
    actor: authorizedBy,
    entityType: 'CustodyRecord',
    entityId: recordId,
    newState: {
      status: newStatus,
      action,
    },
  });

  // Queue blockchain anchor
  const dataHash = createHash('sha256')
    .update(JSON.stringify({
      recordId,
      action,
      authorizedAt: new Date().toISOString(),
    }))
    .digest('hex');

  await blockchainAnchorQueue.add('anchor-authorization', {
    dealId: record.dealId,
    eventType: `${action.toLowerCase()}_authorized`,
    eventId: recordId,
    dataHash,
  });

  return record;
}

export async function submitDisbursementProof(
  recordId: string,
  proofFile: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  },
  actorId: string
) {
  const record = await prisma.custodyRecord.findUnique({
    where: { id: recordId },
  });

  if (!record) {
    throw new Error('Custody record not found');
  }

  // Upload proof
  const result = await storage.uploadEvidence(
    proofFile.buffer,
    proofFile.filename,
    proofFile.mimeType
  );

  const newStatus =
    record.status === CustodyStatus.RELEASE_AUTHORIZED
      ? CustodyStatus.RELEASE_CONFIRMED
      : CustodyStatus.RETURN_CONFIRMED;

  const updated = await prisma.custodyRecord.update({
    where: { id: recordId },
    data: {
      status: newStatus,
      disbursementProofUrl: result.key,
      disbursementProofHash: result.hash,
      disbursementConfirmedAt: new Date(),
      disbursementConfirmedBy: actorId,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: record.dealId,
    eventType: `${record.authorizedAction}_CONFIRMED`,
    actor: actorId,
    entityType: 'CustodyRecord',
    entityId: recordId,
    newState: {
      status: newStatus,
    },
  });

  // Queue blockchain anchor
  const dataHash = createHash('sha256')
    .update(JSON.stringify({
      recordId,
      confirmedAt: new Date().toISOString(),
      proofHash: result.hash,
    }))
    .digest('hex');

  await blockchainAnchorQueue.add('anchor-confirmation', {
    dealId: record.dealId,
    eventType: `${record.authorizedAction?.toLowerCase()}_confirmed`,
    eventId: recordId,
    dataHash,
  });

  return updated;
}

export async function listCustodyRecords(dealId: string) {
  return prisma.custodyRecord.findMany({
    where: { dealId },
    orderBy: { createdAt: 'desc' },
  });
}
