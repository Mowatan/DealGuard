import { prisma } from '../../lib/prisma';
import { storage } from '../../lib/storage';
import { createAuditLog } from '../../lib/audit';
import { createHash } from 'crypto';
import { blockchainAnchorQueue, emailSendingQueue } from '../../lib/queue';

interface CreateContractParams {
  dealId: string;
  termsJson: Record<string, any>;
  milestones?: Array<{
    title: string;
    description?: string;
    order: number;
    conditionsJson?: Record<string, any>;
    evidenceChecklistJson?: Record<string, any>;
    releaseAmount?: number;
    returnAmount?: number;
    currency?: string;
    deadline?: string;
    gracePeriodDays?: number;
  }>;
}

export async function createContractVersion(
  params: CreateContractParams,
  actorId: string
) {
  // Get the latest version for this deal
  const latestContract = await prisma.contract.findFirst({
    where: { dealId: params.dealId },
    orderBy: { version: 'desc' },
  });

  const newVersion = latestContract ? latestContract.version + 1 : 1;

  const contract = await prisma.contract.create({
    data: {
      dealId: params.dealId,
      version: newVersion,
      termsJson: params.termsJson,
      milestones: params.milestones
        ? {
            create: params.milestones.map((m) => ({
              title: m.title, // e.g., "First Payment"
              name: m.title, // Use title for name as well for backward compatibility
              description: m.description,
              order: m.order,
              conditionsJson: m.conditionsJson,
              evidenceChecklistJson: m.evidenceChecklistJson,
              releaseAmount: m.releaseAmount,
              returnAmount: m.returnAmount,
              currency: m.currency,
              deadline: m.deadline ? new Date(m.deadline) : null,
              gracePeriodDays: m.gracePeriodDays,
            })),
          }
        : undefined,
    },
    include: {
      milestones: true,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: params.dealId,
    eventType: 'CONTRACT_VERSION_CREATED',
    actor: actorId,
    entityType: 'Contract',
    entityId: contract.id,
    newState: { version: newVersion },
    metadata: { termsJson: params.termsJson },
  });

  return contract;
}

export async function getContractById(id: string) {
  return prisma.contract.findUnique({
    where: { id },
    include: {
      milestones: {
        orderBy: { order: 'asc' },
        include: {
          obligations: {
            include: {
              party: true,
            },
          },
          evidenceItems: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      acceptances: {
        include: {
          party: true,
        },
      },
      deal: {
        include: {
          parties: true,
        },
      },
    },
  });
}

export async function uploadPhysicalDocument(
  contractId: string,
  buffer: Buffer,
  filename: string,
  mimeType: string,
  actorId: string
) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  // Upload to storage
  const result = await storage.uploadDocument(buffer, filename, mimeType);

  // Update contract with document details
  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: {
      physicalDocumentUrl: result.key,
      physicalDocumentHash: result.hash,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: contract.dealId,
    eventType: 'CONTRACT_DOCUMENT_UPLOADED',
    actor: actorId,
    entityType: 'Contract',
    entityId: contractId,
    newState: {
      documentHash: result.hash,
    },
  });

  return updated;
}

export async function acceptContract(contractId: string, partyId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { deal: { include: { parties: true } } },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  // Check if already accepted
  const existing = await prisma.contractAcceptance.findUnique({
    where: {
      contractId_partyId: {
        contractId,
        partyId,
      },
    },
  });

  if (existing) {
    throw new Error('Party has already accepted this contract');
  }

  const acceptance = await prisma.contractAcceptance.create({
    data: {
      contractId,
      partyId,
    },
  });

  // Check if all parties have accepted
  const acceptanceCount = await prisma.contractAcceptance.count({
    where: { contractId },
  });

  const requiredParties = contract.deal.parties.length;

  if (acceptanceCount === requiredParties) {
    // Mark contract as effective
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        isEffective: true,
        effectiveAt: new Date(),
      },
    });

    // Create audit log
    await createAuditLog({
      dealId: contract.dealId,
      eventType: 'CONTRACT_EFFECTIVE',
      actor: partyId,
      entityType: 'Contract',
      entityId: contractId,
      newState: { isEffective: true },
    });

    // Queue blockchain anchoring
    const dataHash = createHash('sha256')
      .update(JSON.stringify(contract.termsJson))
      .digest('hex');

    await blockchainAnchorQueue.add('anchor-contract', {
      dealId: contract.dealId,
      eventType: 'contract_effective',
      eventId: contractId,
      dataHash,
    });

    // Send email notifications to all parties
    const deal = contract.deal;
    const partyEmails = deal.parties.map(party => party.contactEmail);

    for (const party of partyEmails) {
      await emailSendingQueue.add(
        'send-contract-effective',
        {
          to: party,
          subject: `Contract Effective: Deal ${deal.dealNumber}`,
          template: 'contract-effective',
          variables: {
            dealNumber: deal.dealNumber,
            dealTitle: deal.title,
            contractVersion: contract.version,
            effectiveDate: new Date().toLocaleString(),
            blockchainHash: dataHash,
          },
          dealId: deal.id,
          priority: 7,
        },
        { priority: 7 }
      );
    }
  }

  return acceptance;
}

export async function checkAcceptanceStatus(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      deal: { include: { parties: true } },
      acceptances: { include: { party: true } },
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  const requiredParties = contract.deal.parties.length;
  const acceptedCount = contract.acceptances.length;

  return {
    isFullyAccepted: acceptedCount === requiredParties,
    requiredParties,
    acceptedCount,
    pendingParties: contract.deal.parties.filter(
      (p) => !contract.acceptances.some((a) => a.partyId === p.id)
    ),
    acceptances: contract.acceptances,
  };
}
