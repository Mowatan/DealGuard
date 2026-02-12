import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as dealService from './deals.service';
import { authenticate } from '../../middleware/auth';
import { requireCaseOfficer } from '../../middleware/authorize';

const createDealSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  parties: z.array(z.object({
    role: z.enum(['BUYER', 'SELLER', 'PAYER', 'PAYEE', 'BENEFICIARY', 'AGENT', 'OTHER']),
    name: z.string(),
    isOrganization: z.boolean().default(false),
    organizationId: z.string().optional(),
    contactEmail: z.string().email(),
    contactPhone: z.string().optional(),
  })).min(2),
});

export async function dealsRoutes(server: FastifyInstance) {
  // Create new deal (all authenticated users)
  server.post(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    try {
      const body = createDealSchema.parse(request.body);
      const deal = await dealService.createDeal(body);
      return reply.code(201).send(deal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      throw error;
    }
  });

  // List deals (all authenticated users)
  server.get(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { status, page = '1', limit = '20' } = request.query as any;
    const deals = await dealService.listDeals({
      status: status && status !== 'undefined' ? status : undefined,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    return deals;
  });

  // Get deal by ID (all authenticated users)
  server.get(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const deal = await dealService.getDealById(id);
    
    if (!deal) {
      return reply.code(404).send({ error: 'Deal not found' });
    }
    
    return deal;
  });

  // Update deal status (case officer and above)
  server.patch(
    '/:id/status',
    {
      preHandler: [authenticate, requireCaseOfficer],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, actorId } = request.body as any;
    
    const deal = await dealService.updateDealStatus(id, status, actorId);
    return deal;
  });

  // Get deal audit trail (all authenticated users)
  server.get(
    '/:id/audit',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const audit = await dealService.getDealAuditTrail(id);
    return audit;
  });
}
