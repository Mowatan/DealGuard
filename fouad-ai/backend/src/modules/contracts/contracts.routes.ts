import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as contractService from './contracts.service';
import { authenticate } from '../../middleware/auth';
import { requireCaseOfficer } from '../../middleware/authorize';

const createContractSchema = z.object({
  dealId: z.string(),
  termsJson: z.record(z.any()),
  milestones: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number(),
    conditionsJson: z.record(z.any()).optional(),
    evidenceChecklistJson: z.record(z.any()).optional(),
    releaseAmount: z.number().optional(),
    returnAmount: z.number().optional(),
    currency: z.string().default('EGP'),
    deadline: z.string().optional(),
    gracePeriodDays: z.number().optional(),
  })).optional(),
});

export async function contractsRoutes(server: FastifyInstance) {
  // Create new contract version (case officer and above)
  server.post(
    '/',
    {
      preHandler: [authenticate, requireCaseOfficer],
    },
    async (request, reply) => {
    try {
      const body = createContractSchema.parse(request.body);
      const actorId = request.user!.id; // Get from authenticated user
      const contract = await contractService.createContractVersion(body, actorId);
      return reply.code(201).send(contract);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      throw error;
    }
  });

  // Get contract by ID (all authenticated users)
  server.get(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const contract = await contractService.getContractById(id, request.user!.id);

    if (!contract) {
      return reply.code(404).send({ error: 'Contract not found' });
    }

    return contract;
  });

  // Upload physical contract document (case officer and above)
  server.post(
    '/:id/document',
    {
      preHandler: [authenticate, requireCaseOfficer],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const actorId = request.user!.id; // Get from authenticated user
    
    const contract = await contractService.uploadPhysicalDocument(
      id,
      buffer,
      data.filename,
      data.mimetype,
      actorId
    );
    
    return contract;
  });

  // Party accepts contract (all authenticated users)
  server.post(
    '/:id/accept',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const { partyId } = request.body as any;

    try {
      const acceptance = await contractService.acceptContract(id, partyId, request.user!.id);
      return acceptance;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return reply.code(403).send({ error: error.message });
      }
      throw error;
    }
  });

  // Check if contract is fully accepted (all authenticated users)
  server.get(
    '/:id/acceptance-status',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const status = await contractService.checkAcceptanceStatus(id, request.user!.id);
      return status;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return reply.code(403).send({ error: error.message });
      }
      throw error;
    }
  });
}
