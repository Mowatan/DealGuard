import { prisma } from '../../lib/prisma';
import { storage } from '../../lib/storage';
import { createAuditLog } from '../../lib/audit';
import { aiSuggestionQueue } from '../../lib/queue';
import { EvidenceStatus } from '@prisma/client';

interface CreateEvidenceParams {
  dealId: string;
  milestoneId?: string;
  subject?: string;
  description?: string;
  sourceType: 'UPLOAD' | 'EMAIL' | 'API';
  sourceEmail?: string;
  files: Array<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }>;
  actorId: string;
}

export async function createEvidence(params: CreateEvidenceParams) {
  const evidence = await prisma.evidenceItem.create({
    data: {
      dealId: params.dealId,
      milestoneId: params.milestoneId,
      subject: params.subject,
      description: params.description,
      sourceType: params.sourceType,
      sourceEmail: params.sourceEmail,
      status: EvidenceStatus.RECEIVED,
    },
  });

  // Upload attachments
  const attachments = await Promise.all(
    params.files.map(async (file) => {
      const result = await storage.uploadEvidence(
        file.buffer,
        file.filename,
        file.mimeType
      );

      return prisma.attachment.create({
        data: {
          evidenceItemId: evidence.id,
          filename: file.filename,
          mimeType: file.mimeType,
          sizeBytes: result.size,
          s3Key: result.key,
          sha256Hash: result.hash,
        },
      });
    })
  );

  // Create audit log
  await createAuditLog({
    dealId: params.dealId,
    eventType: 'EVIDENCE_RECEIVED',
    actor: params.actorId,
    entityType: 'EvidenceItem',
    entityId: evidence.id,
    newState: {
      subject: params.subject,
      attachmentCount: attachments.length,
    },
  });

  // Request AI mapping suggestion if milestone not specified
  if (!params.milestoneId) {
    await requestMappingSuggestion(evidence.id);
  }

  return { ...evidence, attachments };
}

export async function listEvidenceByDeal(dealId: string, status?: EvidenceStatus) {
  return prisma.evidenceItem.findMany({
    where: {
      dealId,
      ...(status && { status }),
    },
    include: {
      attachments: true,
      milestone: {
        select: {
          id: true,
          title: true,
          sequence: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getEvidenceById(id: string) {
  return prisma.evidenceItem.findUnique({
    where: { id },
    include: {
      attachments: true,
      milestone: true,
      deal: {
        include: {
          parties: true,
        },
      },
    },
  });
}

export async function reviewEvidence(
  evidenceId: string,
  status: EvidenceStatus,
  milestoneId: string | null,
  reviewNotes: string,
  reviewedBy: string
) {
  const evidence = await prisma.evidenceItem.update({
    where: { id: evidenceId },
    data: {
      status,
      milestoneId: milestoneId || undefined,
      reviewNotes,
      reviewedBy,
      reviewedAt: new Date(),
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: evidence.dealId,
    eventType: 'EVIDENCE_REVIEWED',
    actor: reviewedBy,
    entityType: 'EvidenceItem',
    entityId: evidenceId,
    newState: {
      status,
      milestoneId,
    },
    metadata: { reviewNotes },
  });

  // Phase 2: If evidence is ACCEPTED and mapped to a milestone, evaluate milestone readiness
  if (status === EvidenceStatus.ACCEPTED && milestoneId) {
    try {
      // Import milestone service dynamically to avoid circular dependency
      const { evaluateMilestoneReadiness } = await import('../milestones/milestones.service');
      await evaluateMilestoneReadiness(milestoneId);
    } catch (error) {
      console.error('Error evaluating milestone readiness:', error);
      // Don't fail the evidence review if milestone evaluation fails
    }
  }

  return evidence;
}

export async function requestMappingSuggestion(evidenceId: string) {
  await aiSuggestionQueue.add('map-evidence', {
    type: 'EVIDENCE_MAPPING',
    data: { evidenceId },
  });
}

// ============================================================================
// EMAIL PROCESSING
// ============================================================================

export interface InboundEmail {
  to: string; // deal-{id}@fouad.ai
  from: string;
  subject: string;
  bodyPlain: string;
  bodyHtml?: string;
  attachments: Array<{
    filename: string;
    contentType: string;
    content: Buffer;
  }>;
  timestamp: Date;
}

export async function processInboundEmail(emailData: InboundEmail) {
  console.log(`Processing inbound email to: ${emailData.to}`);

  // Extract deal ID from email address
  const dealIdMatch = emailData.to.match(/deal-([^@]+)@/);
  if (!dealIdMatch) {
    console.error('Invalid deal email address:', emailData.to);
    return;
  }

  const dealId = dealIdMatch[1];

  // Verify deal exists and get parties
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      parties: true,
    },
  });

  if (!deal) {
    console.error('Deal not found:', dealId);
    return;
  }

  // Phase 2: Verify sender email matches registered party contacts
  const senderEmail = emailData.from.toLowerCase();
  const validSender = deal.parties.some(
    (party) => party.contactEmail.toLowerCase() === senderEmail
  );

  if (!validSender) {
    // Quarantine evidence - sender not registered
    console.warn(`Quarantining email from unregistered sender: ${senderEmail}`);
    return quarantineEvidence(
      dealId,
      emailData,
      `Sender email (${senderEmail}) not registered with any party in this deal`
    );
  }

  // Create evidence item (sender verified)
  const evidence = await createEvidence({
    dealId,
    subject: emailData.subject,
    description: emailData.bodyPlain,
    sourceType: 'EMAIL',
    sourceEmail: emailData.from,
    files: emailData.attachments.map((att) => ({
      buffer: att.content,
      filename: att.filename,
      mimeType: att.contentType,
    })),
    actorId: 'EMAIL_SYSTEM',
  });

  console.log(`Created evidence ${evidence.id} for deal ${dealId}`);

  return evidence;
}

// ============================================================================
// QUARANTINE EVIDENCE
// ============================================================================

async function quarantineEvidence(
  dealId: string,
  emailData: InboundEmail,
  reason: string
) {
  console.log(`Quarantining evidence for deal ${dealId}: ${reason}`);

  // Create evidence item with QUARANTINED status
  const evidence = await prisma.evidenceItem.create({
    data: {
      dealId,
      subject: emailData.subject,
      description: emailData.bodyPlain,
      sourceType: 'EMAIL',
      sourceEmail: emailData.from,
      status: EvidenceStatus.QUARANTINED,
      quarantineReason: reason,
    },
  });

  // Upload attachments (still store them, but mark evidence as quarantined)
  const attachments = await Promise.all(
    emailData.attachments.map(async (att) => {
      const result = await storage.uploadEvidence(
        att.content,
        att.filename,
        att.contentType
      );

      return prisma.attachment.create({
        data: {
          evidenceItemId: evidence.id,
          filename: att.filename,
          mimeType: att.contentType,
          sizeBytes: result.size,
          s3Key: result.key,
          sha256Hash: result.hash,
        },
      });
    })
  );

  // Create audit log
  await createAuditLog({
    dealId,
    eventType: 'EVIDENCE_QUARANTINED',
    actor: 'EMAIL_SYSTEM',
    entityType: 'EvidenceItem',
    entityId: evidence.id,
    newState: {
      subject: emailData.subject,
      attachmentCount: attachments.length,
      quarantineReason: reason,
    },
  });

  return { ...evidence, attachments };
}

// ============================================================================
// QUARANTINE MANAGEMENT
// ============================================================================

export async function listQuarantinedEvidence() {
  return prisma.evidenceItem.findMany({
    where: {
      status: EvidenceStatus.QUARANTINED,
    },
    include: {
      attachments: true,
      deal: {
        select: {
          id: true,
          dealNumber: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function releaseFromQuarantine(
  evidenceId: string,
  releasedBy: string,
  releaseNotes?: string
) {
  const evidence = await prisma.evidenceItem.findUnique({
    where: { id: evidenceId },
  });

  if (!evidence) {
    throw new Error('Evidence not found');
  }

  if (evidence.status !== EvidenceStatus.QUARANTINED) {
    throw new Error('Evidence is not quarantined');
  }

  // Release from quarantine and set to RECEIVED
  const updated = await prisma.evidenceItem.update({
    where: { id: evidenceId },
    data: {
      status: EvidenceStatus.RECEIVED,
      quarantineReason: null,
      verificationNotes: releaseNotes,
      verifiedByUserId: releasedBy,
    },
  });

  // Create audit log
  await createAuditLog({
    dealId: evidence.dealId,
    eventType: 'EVIDENCE_RELEASED_FROM_QUARANTINE',
    actor: releasedBy,
    entityType: 'EvidenceItem',
    entityId: evidenceId,
    oldState: { status: EvidenceStatus.QUARANTINED },
    newState: { status: EvidenceStatus.RECEIVED },
    metadata: { releaseNotes },
  });

  return updated;
}
