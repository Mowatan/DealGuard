import { prisma } from '../../lib/prisma';
import { storage } from '../../lib/storage';
import { createAuditLog } from '../../lib/audit';
import { blockchainAnchorQueue, emailSendingQueue } from '../../lib/queue';
import { CustodyStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { canUserAccessDeal, canUserAccessCustodyRecord, isAdmin, isAdminOrCaseOfficer } from '../../lib/authorization';
import { getAdminEmails } from '../../lib/admin-cache';

// Constants
const EMAIL_PRIORITIES = {
  HIGH: 9,
  MEDIUM: 8,
  NORMAL: 7,
} as const;

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

const PARTY_ROLES = {
  PAYER: 'PAYER',
  PAYEE: 'PAYEE',
} as const;

// Types
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

interface EmailNotification {
  to: string | string[];
  subject: string;
  template: string;
  variables: Record<string, any>;
  dealId: string;
  priority: number;
}

interface BlockchainAnchorData {
  dealId: string;
  eventType: string;
  eventId: string;
  data: Record<string, any>;
}

// Helper Functions
// NOTE: getAdminEmails() is now imported from admin-cache.ts for performance (caching)

async function queueEmailNotification(
  jobName: string,
  notification: EmailNotification
): Promise<void> {
  const recipients = Array.isArray(notification.to)
    ? notification.to
    : [notification.to];

  for (const email of recipients) {
    await emailSendingQueue.add(
      jobName,
      {
        to: email,
        subject: notification.subject,
        template: notification.template,
        variables: notification.variables,
        dealId: notification.dealId,
        priority: notification.priority,
      },
      { priority: notification.priority }
    );
  }
}

async function createBlockchainAnchor(
  anchorType: string,
  data: BlockchainAnchorData
): Promise<string> {
  const dataHash = createHash('sha256')
    .update(JSON.stringify(data.data))
    .digest('hex');

  await blockchainAnchorQueue.add(anchorType, {
    dealId: data.dealId,
    eventType: data.eventType,
    eventId: data.eventId,
    dataHash,
  });

  return dataHash;
}

function formatAmount(amount: number, decimals: number = 2): string {
  return amount.toFixed(decimals);
}

function findPartyByRole(parties: any[], role: string) {
  return parties.find(p => p.role === role);
}

export async function submitFundingProof(params: SubmitFundingProofParams) {
  // Check if user has access to this deal
  const hasAccess = await canUserAccessDeal(params.dealId, params.actorId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this deal');
  }

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

  // Notify admins
  await notifyAdminsOfFundingSubmission(params, record);

  return record;
}

async function notifyAdminsOfFundingSubmission(
  params: SubmitFundingProofParams,
  record: any
): Promise<void> {
  const adminEmails = await getAdminEmails();
  const deal = await prisma.deal.findUnique({
    where: { id: params.dealId },
    select: { dealNumber: true, title: true },
  });

  if (adminEmails.length === 0 || !deal) return;

  await queueEmailNotification('send-custody-funding-submitted', {
    to: adminEmails,
    subject: `Action Required: Verify Funding - Deal ${deal.dealNumber}`,
    template: 'custody-funding-submitted',
    variables: {
      dealNumber: deal.dealNumber,
      dealTitle: deal.title,
      amount: formatAmount(params.amount),
      currency: params.currency,
      submittedBy: params.actorId,
      submittedAt: new Date().toLocaleString(),
      paymentMethod: 'Bank Transfer',
    },
    dealId: params.dealId,
    priority: EMAIL_PRIORITIES.NORMAL,
  });
}

export async function verifyFunding(recordId: string, verifiedBy: string) {
  // Only admins can verify funding
  const isAuthorized = await isAdmin(verifiedBy);

  if (!isAuthorized) {
    throw new Error('Unauthorized: Only admins can verify funding');
  }

  const record = await prisma.custodyRecord.update({
    where: { id: recordId },
    data: {
      status: CustodyStatus.FUNDING_VERIFIED,
      fundingVerifiedAt: new Date(),
      fundingVerifiedBy: verifiedBy,
    },
    include: {
      deal: {
        include: {
          parties: true,
        },
      },
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

  // Anchor to blockchain
  const dataHash = await createBlockchainAnchor('anchor-funding', {
    dealId: record.dealId,
    eventType: 'funding_verified',
    eventId: recordId,
    data: {
      recordId,
      amount: record.amount.toString(),
      currency: record.currency,
      verifiedAt: new Date().toISOString(),
    },
  });

  // Notify payer party
  await notifyPayerOfVerification(record, verifiedBy, dataHash);

  return record;
}

async function notifyPayerOfVerification(
  record: any,
  verifiedBy: string,
  blockchainHash: string
): Promise<void> {
  const payerParty = findPartyByRole(record.deal.parties, PARTY_ROLES.PAYER);

  if (!payerParty) return;

  await queueEmailNotification('send-custody-funding-verified', {
    to: payerParty.contactEmail,
    subject: `Funding Verified: Deal ${record.deal.dealNumber}`,
    template: 'custody-funding-verified',
    variables: {
      dealNumber: record.deal.dealNumber,
      dealTitle: record.deal.title,
      amount: formatAmount(record.amount),
      currency: record.currency,
      verifiedAt: new Date().toLocaleString(),
      verifiedBy,
      blockchainHash,
    },
    dealId: record.dealId,
    priority: EMAIL_PRIORITIES.NORMAL,
  });
}

export async function authorizeAction(
  recordId: string,
  action: 'RELEASE' | 'RETURN',
  authorizedBy: string
) {
  // Only case officers and admins can authorize actions
  const isAuthorized = await isAdminOrCaseOfficer(authorizedBy);

  if (!isAuthorized) {
    throw new Error('Unauthorized: Only case officers and admins can authorize actions');
  }

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
    include: {
      deal: {
        include: {
          parties: true,
        },
      },
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

  // Anchor to blockchain
  const dataHash = await createBlockchainAnchor('anchor-authorization', {
    dealId: record.dealId,
    eventType: `${action.toLowerCase()}_authorized`,
    eventId: recordId,
    data: {
      recordId,
      action,
      authorizedAt: new Date().toISOString(),
    },
  });

  // Notify admins (custodians)
  await notifyAdminsOfAuthorization(record, action, authorizedBy, dataHash);

  return record;
}

async function notifyAdminsOfAuthorization(
  record: any,
  action: 'RELEASE' | 'RETURN',
  authorizedBy: string,
  blockchainHash: string
): Promise<void> {
  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) return;

  const recipientParty = findPartyByRole(
    record.deal.parties,
    action === 'RELEASE' ? PARTY_ROLES.PAYEE : PARTY_ROLES.PAYER
  );

  await queueEmailNotification('send-custody-release-authorized', {
    to: adminEmails,
    subject: `🚨 Action Required: Process Fund ${action} - Deal ${record.deal.dealNumber}`,
    template: 'custody-release-authorized',
    variables: {
      dealNumber: record.deal.dealNumber,
      dealTitle: record.deal.title,
      action,
      amount: formatAmount(record.amount),
      currency: record.currency,
      authorizedBy,
      authorizedAt: new Date().toLocaleString(),
      recipientParty: recipientParty?.name || 'Unknown',
      blockchainHash,
    },
    dealId: record.dealId,
    priority: EMAIL_PRIORITIES.HIGH,
  });
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
  // Only admins can submit disbursement proof
  const isAuthorized = await isAdmin(actorId);

  if (!isAuthorized) {
    throw new Error('Unauthorized: Only admins can submit disbursement proof');
  }

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
    include: {
      deal: {
        include: {
          parties: true,
        },
      },
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

  // Anchor to blockchain
  const dataHash = await createBlockchainAnchor('anchor-confirmation', {
    dealId: record.dealId,
    eventType: `${record.authorizedAction?.toLowerCase()}_confirmed`,
    eventId: recordId,
    data: {
      recordId,
      confirmedAt: new Date().toISOString(),
      proofHash: result.hash,
    },
  });

  // Notify all parties
  await notifyPartiesOfDisbursement(updated, record, recordId, dataHash);

  return updated;
}

async function notifyPartiesOfDisbursement(
  updated: any,
  record: any,
  recordId: string,
  blockchainHash: string
): Promise<void> {
  const partyEmails = updated.deal.parties.map((party: any) => party.contactEmail);
  const recipientParty = findPartyByRole(
    updated.deal.parties,
    record.authorizedAction === 'RELEASE' ? PARTY_ROLES.PAYEE : PARTY_ROLES.PAYER
  );

  await queueEmailNotification('send-custody-disbursement-confirmed', {
    to: partyEmails,
    subject: `Disbursement Complete: Deal ${updated.deal.dealNumber}`,
    template: 'custody-disbursement-confirmed',
    variables: {
      dealNumber: updated.deal.dealNumber,
      dealTitle: updated.deal.title,
      action: record.authorizedAction || 'RELEASE',
      amount: formatAmount(updated.amount),
      currency: updated.currency,
      recipientParty: recipientParty?.name || 'Unknown',
      confirmedAt: new Date().toLocaleString(),
      transactionRef: recordId.substring(0, 12),
      blockchainHash,
    },
    dealId: updated.dealId,
    priority: EMAIL_PRIORITIES.MEDIUM,
  });
}

export async function listCustodyRecords(dealId: string, userId: string) {
  // Check if user has access to this deal
  const hasAccess = await canUserAccessDeal(dealId, userId);

  if (!hasAccess) {
    throw new Error('Unauthorized: You do not have access to this deal');
  }

  return prisma.custodyRecord.findMany({
    where: { dealId },
    orderBy: { createdAt: 'desc' },
    take: 50, // PERFORMANCE: Limit to 50 most recent custody records
  });
}
