import { FastifyInstance } from 'fastify';
import * as blockchainService from './blockchain.service';
import { authenticate } from '../../middleware/auth';

export async function blockchainRoutes(server: FastifyInstance) {
  // Get blockchain anchors for a deal (all authenticated users)
  server.get(
    '/deal/:dealId',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { dealId } = request.params as { dealId: string };
    const anchors = await blockchainService.getAnchorsForDeal(dealId);
    return anchors;
  });

  // Get anchor by ID (all authenticated users)
  server.get(
    '/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const anchor = await blockchainService.getAnchorById(id);

    if (!anchor) {
      return reply.code(404).send({ error: 'Anchor not found' });
    }

    return anchor;
  });

  // Verify anchor on-chain (all authenticated users)
  server.get(
    '/:id/verify',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const verification = await blockchainService.verifyAnchor(id);
    return verification;
  });
}
