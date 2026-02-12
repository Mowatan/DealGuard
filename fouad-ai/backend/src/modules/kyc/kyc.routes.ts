import { FastifyInstance } from 'fastify';
import * as kycService from './kyc.service';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

export default async function kycRoutes(fastify: FastifyInstance) {
  // Upload KYC document
  fastify.post(
    '/api/kyc/parties/:partyId/documents',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { partyId } = request.params as { partyId: string };
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'User not authenticated' });
      }

      try {
        // Handle multipart file upload
        const data = await request.file();

        if (!data) {
          return reply.code(400).send({ error: 'No file uploaded' });
        }

        const buffer = await data.toBuffer();
        const result = await kycService.uploadKYCDocument(
          partyId,
          buffer,
          data.filename,
          data.mimetype,
          userId
        );

        return reply.send(result);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Submit KYC for verification
  fastify.post(
    '/api/kyc/parties/:partyId/submit',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { partyId } = request.params as { partyId: string };
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'User not authenticated' });
      }

      try {
        const party = await kycService.submitForVerification(partyId, userId);
        return reply.send(party);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Get KYC status
  fastify.get(
    '/api/kyc/parties/:partyId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { partyId } = request.params as { partyId: string };

      try {
        const status = await kycService.getKYCStatus(partyId);
        return reply.send(status);
      } catch (error: any) {
        return reply.code(404).send({ error: error.message });
      }
    }
  );

  // Get KYC document URLs (with presigned access)
  fastify.get(
    '/api/kyc/parties/:partyId/documents',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { partyId } = request.params as { partyId: string };

      try {
        const urls = await kycService.getKYCDocumentUrls(partyId);
        return reply.send(urls);
      } catch (error: any) {
        return reply.code(404).send({ error: error.message });
      }
    }
  );

  // Verify KYC (admin only)
  fastify.post(
    '/api/kyc/parties/:partyId/verify',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      const { partyId } = request.params as { partyId: string };
      const { notes } = request.body as { notes?: string };
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send({ error: 'User not authenticated' });
      }

      try {
        const party = await kycService.verifyKYC(partyId, userId, notes);
        return reply.send(party);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // Reject KYC (admin only)
  fastify.post(
    '/api/kyc/parties/:partyId/reject',
    { preHandler: [authenticate, authorize(['ADMIN'])] },
    async (request, reply) => {
      const { partyId } = request.params as { partyId: string };
      const { rejectionReason } = request.body as { rejectionReason: string };
      const userId = request.user?.id;

      if (!rejectionReason) {
        return reply.code(400).send({ error: 'Rejection reason is required' });
      }

      if (!userId) {
        return reply.code(401).send({ error: 'User not authenticated' });
      }

      try {
        const party = await kycService.rejectKYC(partyId, userId, rejectionReason);
        return reply.send(party);
      } catch (error: any) {
        return reply.code(400).send({ error: error.message });
      }
    }
  );

  // List pending KYC reviews (case officer and above)
  fastify.get(
    '/api/kyc/pending',
    { preHandler: [authenticate, authorize(['CASE_OFFICER'])] },
    async (request, reply) => {
      try {
        const pending = await kycService.listPendingKYC();
        return reply.send(pending);
      } catch (error: any) {
        return reply.code(500).send({ error: error.message });
      }
    }
  );
}
