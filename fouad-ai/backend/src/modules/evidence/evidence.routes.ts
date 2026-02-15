import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as evidenceService from './evidence.service';
import { authenticate } from '../../middleware/auth';
import { requireCaseOfficer } from '../../middleware/authorize';
import { EvidenceSourceType } from '@prisma/client';

const createEvidenceSchema = z.object({
  dealId: z.string(),
  milestoneId: z.string().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  sourceType: z.string().default('UPLOAD'),
});

export async function evidenceRoutes(server: FastifyInstance) {
  // Create evidence item with file upload (all authenticated users)
  server.post(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    try {
      const parts = request.parts();
      let metadata: any = {};
      const files: Array<{ buffer: Buffer; filename: string; mimeType: string }> = [];

      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          files.push({
            buffer,
            filename: part.filename,
            mimeType: part.mimetype,
          });
        } else {
          metadata[part.fieldname] = (part as any).value;
        }
      }

      const validated = createEvidenceSchema.parse(metadata);
      const actorId = request.user!.id; // Get from authenticated user

      const evidence = await evidenceService.createEvidence({
        ...validated,
        sourceType: validated.sourceType as EvidenceSourceType,
        files,
        actorId,
      });

      return reply.code(201).send(evidence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      throw error;
    }
  });

  // List evidence for a deal (all authenticated users)
  server.get(
    '/deal/:dealId',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { dealId } = request.params as { dealId: string };
    const { status } = request.query as any;

    const evidence = await evidenceService.listEvidenceByDeal(dealId, status);
    return evidence;
  });

  // Get evidence by ID (all authenticated users)
  server.get(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const evidence = await evidenceService.getEvidenceById(id);

    if (!evidence) {
      return reply.code(404).send({ error: 'Evidence not found' });
    }

    return evidence;
  });

  // Accept/reject evidence (case officer and above)
  server.patch(
    '/:id/review',
    {
      preHandler: [authenticate, requireCaseOfficer],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, milestoneId, reviewNotes, reviewedBy } = request.body as any;

    const evidence = await evidenceService.reviewEvidence(
      id,
      status,
      milestoneId,
      reviewNotes,
      reviewedBy
    );

    return evidence;
  });

  // Request AI suggestion for evidence mapping (case officer and above)
  server.post(
    '/:id/suggest-mapping',
    {
      preHandler: [authenticate, requireCaseOfficer],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    await evidenceService.requestMappingSuggestion(id);
    return { message: 'AI suggestion requested' };
  });

  // List quarantined evidence (case officer and above)
  server.get(
    '/quarantined',
    {
      preHandler: [authenticate, requireCaseOfficer],
    },
    async (request, reply) => {
    const evidence = await evidenceService.listQuarantinedEvidence();
    return evidence;
  });

  // Release evidence from quarantine (case officer and above)
  server.post(
    '/:id/release',
    {
      preHandler: [authenticate, requireCaseOfficer],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const { releaseNotes } = request.body as { releaseNotes?: string };
    const releasedBy = request.user!.id;

    try {
      const evidence = await evidenceService.releaseFromQuarantine(
        id,
        releasedBy,
        releaseNotes
      );
      return evidence;
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });
}
