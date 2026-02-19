import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as custodyService from './custody.service';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authorize';

const submitFundingSchema = z.object({
  dealId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('EGP'),
});

export async function custodyRoutes(server: FastifyInstance) {
  // Submit funding proof (all authenticated users)
  server.post(
    '/funding',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const parts = request.parts();
    let metadata: any = {};
    let file: { buffer: Buffer; filename: string; mimeType: string } | null = null;

    for await (const part of parts) {
      if (part.type === 'file') {
        file = {
          buffer: await part.toBuffer(),
          filename: part.filename,
          mimeType: part.mimetype,
        };
      } else {
        metadata[part.fieldname] = (part as any).value;
      }
    }

    const validated = submitFundingSchema.parse(metadata);
    const actorId = request.user!.id; // Get from authenticated user

    if (!file) {
      return reply.code(400).send({ error: 'Funding proof file required' });
    }

    const record = await custodyService.submitFundingProof({
      ...validated,
      proofFile: file,
      actorId,
    });

    return reply.code(201).send(record);
  });

  // Verify funding (admin and above)
  server.post(
    '/:id/verify',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const { verifiedBy } = request.body as any;

    const record = await custodyService.verifyFunding(id, verifiedBy);
    return record;
  });

  // Authorize release/return (admin and above)
  server.post(
    '/:id/authorize',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action, authorizedBy } = request.body as any; // action: RELEASE | RETURN

    const record = await custodyService.authorizeAction(id, action, authorizedBy);
    return record;
  });

  // Submit disbursement proof (admin and above)
  server.post(
    '/:id/disbursement',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const parts = request.parts();
    let file: { buffer: Buffer; filename: string; mimeType: string } | null = null;
    const actorId = request.user!.id; // Get from authenticated user

    for await (const part of parts) {
      if (part.type === 'file') {
        file = {
          buffer: await part.toBuffer(),
          filename: part.filename,
          mimeType: part.mimetype,
        };
      }
    }

    if (!file) {
      return reply.code(400).send({ error: 'Disbursement proof file required' });
    }

    const record = await custodyService.submitDisbursementProof(id, file, actorId);
    return record;
  });

  // List custody records for a deal (all authenticated users)
  server.get(
    '/deal/:dealId',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { dealId } = request.params as { dealId: string };
    try {
      const records = await custodyService.listCustodyRecords(dealId, request.user!.id);
      return records;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return reply.code(403).send({ error: error.message });
      }
      throw error;
    }
  });
}
