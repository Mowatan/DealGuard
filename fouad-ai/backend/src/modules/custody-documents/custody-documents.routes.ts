import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as custodyDocService from './custody-documents.service';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authorize';
import { CustodyDocumentType, DeliveryMethod } from '@prisma/client';

const createCustodyDocumentSchema = z.object({
  dealId: z.string(),
  documentType: z.nativeEnum(CustodyDocumentType),
  description: z.string(),
  deliveryMethod: z.nativeEnum(DeliveryMethod),
  deliveryInstructions: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  courierService: z.string().optional(),
  trackingNumber: z.string().optional(),
  authorizedReceiverName: z.string(),
  insuranceValue: z.number().optional(),
  insurancePolicyNumber: z.string().optional(),
});

const logReceiptSchema = z.object({
  actualReceiverName: z.string(),
  receiptPhotoUrl: z.string().optional(),
  deliveryPersonName: z.string().optional(),
  deliveryPersonId: z.string().optional(),
  documentCondition: z.string().optional(),
  notes: z.string().optional(),
});

const refuseDeliverySchema = z.object({
  refusalReason: z.string(),
  notes: z.string().optional(),
});

const updateTrackingSchema = z.object({
  trackingNumber: z.string(),
  courierService: z.string().optional(),
});

const moveToCustodySchema = z.object({
  vaultLocation: z.string(),
});

const updateCompanySettingsSchema = z.object({
  officeAddress: z.string().optional(),
  officeAddressLine2: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  officePhone: z.string().optional(),
  officeEmail: z.string().email().optional(),
  officeHours: z.string().optional(),
});

const addAuthorizedReceiverSchema = z.object({
  name: z.string().min(1),
});

export async function custodyDocumentsRoutes(server: FastifyInstance) {
  // Get company settings (public - used for delivery instructions)
  server.get('/settings/company', async (request, reply) => {
    try {
      const settings = await custodyDocService.getCompanySettings();
      return settings;
    } catch (error) {
      request.log.error(error, 'Failed to get company settings');
      return reply.code(500).send({ error: 'Failed to get company settings' });
    }
  });

  // Update company settings (admin only)
  server.patch(
    '/settings/company',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request, reply) => {
      try {
        const body = updateCompanySettingsSchema.parse(request.body);
        const settings = await custodyDocService.updateCompanySettings(
          body,
          request.user!.id
        );
        return settings;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        request.log.error(error, 'Failed to update company settings');
        return reply.code(500).send({ error: 'Failed to update company settings' });
      }
    }
  );

  // Add authorized receiver (admin only)
  server.post(
    '/settings/company/authorized-receivers',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request, reply) => {
      try {
        const body = addAuthorizedReceiverSchema.parse(request.body);
        const settings = await custodyDocService.addAuthorizedReceiver(
          body.name,
          request.user!.id
        );
        return settings;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        request.log.error(error, 'Failed to add authorized receiver');
        return reply.code(500).send({ error: 'Failed to add authorized receiver' });
      }
    }
  );

  // Remove authorized receiver (admin only)
  server.delete(
    '/settings/company/authorized-receivers/:name',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request, reply) => {
      try {
        const { name } = request.params as { name: string };
        const decodedName = decodeURIComponent(name);
        const settings = await custodyDocService.removeAuthorizedReceiver(
          decodedName,
          request.user!.id
        );
        return settings;
      } catch (error) {
        request.log.error(error, 'Failed to remove authorized receiver');
        return reply.code(500).send({ error: 'Failed to remove authorized receiver' });
      }
    }
  );

  // Create custody document (authenticated users)
  server.post(
    '/custody-documents',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const body = createCustodyDocumentSchema.parse(request.body);
        const custodyDoc = await custodyDocService.createCustodyDocument({
          ...body,
          expectedDeliveryDate: body.expectedDeliveryDate
            ? new Date(body.expectedDeliveryDate)
            : undefined,
        });
        return reply.code(201).send(custodyDoc);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        request.log.error(error, 'Failed to create custody document');
        return reply.code(500).send({ error: 'Failed to create custody document' });
      }
    }
  );

  // Get custody documents for a deal (authenticated users)
  server.get(
    '/custody-documents/deal/:dealId',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { dealId } = request.params as { dealId: string };
        const documents = await custodyDocService.getCustodyDocumentsByDeal(dealId);
        return documents;
      } catch (error) {
        request.log.error(error, 'Failed to get custody documents');
        return reply.code(500).send({ error: 'Failed to get custody documents' });
      }
    }
  );

  // Get pending deliveries (admin only)
  server.get(
    '/custody-documents/pending',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request, reply) => {
      try {
        const documents = await custodyDocService.getPendingDeliveries();
        return documents;
      } catch (error) {
        request.log.error(error, 'Failed to get pending deliveries');
        return reply.code(500).send({ error: 'Failed to get pending deliveries' });
      }
    }
  );

  // Log document receipt (admin only)
  server.post(
    '/custody-documents/:id/log-receipt',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = logReceiptSchema.parse(request.body);
        const custodyDoc = await custodyDocService.logDocumentReceipt(id, {
          ...body,
          receivedByUserId: request.user!.id,
        });
        return custodyDoc;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message });
        }
        request.log.error(error, 'Failed to log document receipt');
        return reply.code(500).send({ error: 'Failed to log document receipt' });
      }
    }
  );

  // Refuse delivery (admin only)
  server.post(
    '/custody-documents/:id/refuse-delivery',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = refuseDeliverySchema.parse(request.body);
        const custodyDoc = await custodyDocService.refuseDelivery(id, {
          ...body,
          refusedBy: request.user!.id,
        });
        return custodyDoc;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        request.log.error(error, 'Failed to refuse delivery');
        return reply.code(500).send({ error: 'Failed to refuse delivery' });
      }
    }
  );

  // Update tracking info (authenticated users)
  server.patch(
    '/custody-documents/:id/tracking',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateTrackingSchema.parse(request.body);
        const custodyDoc = await custodyDocService.updateTrackingInfo(
          id,
          body.trackingNumber,
          body.courierService
        );
        return custodyDoc;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        request.log.error(error, 'Failed to update tracking info');
        return reply.code(500).send({ error: 'Failed to update tracking info' });
      }
    }
  );

  // Move to custody/vault (admin only)
  server.post(
    '/custody-documents/:id/move-to-custody',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = moveToCustodySchema.parse(request.body);
        const custodyDoc = await custodyDocService.moveToCustody(
          id,
          body.vaultLocation,
          request.user!.id
        );
        return custodyDoc;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Validation error', details: error.errors });
        }
        request.log.error(error, 'Failed to move document to custody');
        return reply.code(500).send({ error: 'Failed to move document to custody' });
      }
    }
  );
}
