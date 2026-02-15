import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { emailSendingQueue } from '../../lib/queue';
import {
  CustodyDocumentType,
  DeliveryMethod,
  CustodyDocumentStatus,
} from '@prisma/client';

interface CreateCustodyDocumentParams {
  dealId: string;
  documentType: CustodyDocumentType;
  description: string;
  deliveryMethod: DeliveryMethod;
  deliveryInstructions?: string;
  expectedDeliveryDate?: Date;
  courierService?: string;
  trackingNumber?: string;
  authorizedReceiverName: string;
  insuranceValue?: number;
  insurancePolicyNumber?: string;
}

interface LogDocumentReceiptParams {
  actualReceiverName: string;
  receivedByUserId: string;
  receiptPhotoUrl?: string;
  deliveryPersonName?: string;
  deliveryPersonId?: string;
  documentCondition?: string;
  notes?: string;
}

interface RefuseDeliveryParams {
  refusalReason: string;
  refusedBy: string;
  notes?: string;
}

export async function createCustodyDocument(params: CreateCustodyDocumentParams) {
  const custodyDoc = await prisma.custodyDocument.create({
    data: {
      dealId: params.dealId,
      documentType: params.documentType,
      description: params.description,
      deliveryMethod: params.deliveryMethod,
      deliveryInstructions: params.deliveryInstructions,
      expectedDeliveryDate: params.expectedDeliveryDate,
      courierService: params.courierService,
      trackingNumber: params.trackingNumber,
      authorizedReceiverName: params.authorizedReceiverName,
      insuranceValue: params.insuranceValue,
      insurancePolicyNumber: params.insurancePolicyNumber,
      status: 'PENDING_DELIVERY',
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
    dealId: params.dealId,
    eventType: 'CUSTODY_DOCUMENT_CREATED',
    actor: 'system', // Will be updated with actual user ID
    entityType: 'CustodyDocument',
    entityId: custodyDoc.id,
    newState: { status: custodyDoc.status },
  });

  // Send delivery instructions email to parties
  await sendDeliveryInstructionsEmail(custodyDoc);

  return custodyDoc;
}

export async function logDocumentReceipt(
  documentId: string,
  params: LogDocumentReceiptParams
) {
  // Get company settings to verify authorized receiver
  const settings = await getCompanySettings();

  // Verify the receiver is authorized
  if (!settings.authorizedReceivers.includes(params.actualReceiverName)) {
    throw new Error(
      `${params.actualReceiverName} is not authorized to receive documents. Authorized receivers: ${settings.authorizedReceivers.join(', ')}`
    );
  }

  const custodyDoc = await prisma.custodyDocument.update({
    where: { id: documentId },
    data: {
      originalReceived: true,
      receivedDate: new Date(),
      actualReceiverName: params.actualReceiverName,
      receivedByUserId: params.receivedByUserId,
      receiptPhotoUrl: params.receiptPhotoUrl,
      status: 'RECEIVED_IN_OFFICE',
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
    dealId: custodyDoc.dealId,
    eventType: 'CUSTODY_DOCUMENT_RECEIVED',
    actor: params.receivedByUserId,
    entityType: 'CustodyDocument',
    entityId: documentId,
    oldState: { status: 'IN_TRANSIT' },
    newState: {
      status: 'RECEIVED_IN_OFFICE',
      receivedBy: params.actualReceiverName,
    },
    metadata: {
      deliveryPersonName: params.deliveryPersonName,
      deliveryPersonId: params.deliveryPersonId,
      documentCondition: params.documentCondition,
      notes: params.notes,
    },
  });

  // Send receipt confirmation email to parties
  await sendReceiptConfirmationEmail(custodyDoc);

  return custodyDoc;
}

export async function refuseDelivery(
  documentId: string,
  params: RefuseDeliveryParams
) {
  const custodyDoc = await prisma.custodyDocument.update({
    where: { id: documentId },
    data: {
      status: 'DELIVERY_REFUSED',
      refusalReason: params.refusalReason,
      refusalNotes: params.notes,
      refusedAt: new Date(),
      refusedBy: params.refusedBy,
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
    dealId: custodyDoc.dealId,
    eventType: 'CUSTODY_DOCUMENT_DELIVERY_REFUSED',
    actor: params.refusedBy,
    entityType: 'CustodyDocument',
    entityId: documentId,
    newState: {
      status: 'DELIVERY_REFUSED',
      refusalReason: params.refusalReason,
    },
    metadata: {
      notes: params.notes,
    },
  });

  // Send refusal notification email to parties
  await sendDeliveryRefusalEmail(custodyDoc);

  return custodyDoc;
}

export async function moveToCustody(documentId: string, vaultLocation: string, userId: string) {
  const custodyDoc = await prisma.custodyDocument.update({
    where: { id: documentId },
    data: {
      status: 'IN_CUSTODY',
      vaultLocation,
    },
  });

  await createAuditLog({
    dealId: custodyDoc.dealId,
    eventType: 'CUSTODY_DOCUMENT_IN_VAULT',
    actor: userId,
    entityType: 'CustodyDocument',
    entityId: documentId,
    oldState: { status: 'RECEIVED_IN_OFFICE' },
    newState: { status: 'IN_CUSTODY', vaultLocation },
  });

  return custodyDoc;
}

export async function updateTrackingInfo(
  documentId: string,
  trackingNumber: string,
  courierService?: string
) {
  const custodyDoc = await prisma.custodyDocument.update({
    where: { id: documentId },
    data: {
      trackingNumber,
      courierService: courierService || undefined,
      status: 'IN_TRANSIT',
    },
  });

  await createAuditLog({
    dealId: custodyDoc.dealId,
    eventType: 'CUSTODY_DOCUMENT_IN_TRANSIT',
    actor: 'system',
    entityType: 'CustodyDocument',
    entityId: documentId,
    newState: {
      trackingNumber,
      courierService,
      status: 'IN_TRANSIT',
    },
  });

  return custodyDoc;
}

export async function getCustodyDocumentsByDeal(dealId: string) {
  return prisma.custodyDocument.findMany({
    where: { dealId },
    orderBy: { createdAt: 'desc' },
    include: {
      receivedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getPendingDeliveries() {
  return prisma.custodyDocument.findMany({
    where: {
      status: {
        in: ['PENDING_DELIVERY', 'IN_TRANSIT'],
      },
    },
    orderBy: { expectedDeliveryDate: 'asc' },
    include: {
      deal: {
        select: {
          id: true,
          dealNumber: true,
          title: true,
        },
      },
    },
  });
}

// Company Settings Management
export async function getCompanySettings() {
  let settings = await prisma.companySettings.findFirst();

  if (!settings) {
    // Create default settings
    settings = await prisma.companySettings.create({
      data: {
        officeAddress: '45 Narges 3, New Cairo, Cairo, Egypt',
        city: 'Cairo',
        country: 'Egypt',
        officeHours: 'Sunday-Thursday, 9 AM - 5 PM',
        authorizedReceivers: [],
        updatedBy: 'system',
      },
    });
  }

  return settings;
}

export async function updateCompanySettings(
  updates: {
    officeAddress?: string;
    officeAddressLine2?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    officePhone?: string;
    officeEmail?: string;
    officeHours?: string;
  },
  updatedBy: string
) {
  const settings = await getCompanySettings();

  return prisma.companySettings.update({
    where: { id: settings.id },
    data: {
      ...updates,
      updatedBy,
    },
  });
}

export async function addAuthorizedReceiver(name: string, updatedBy: string) {
  const settings = await getCompanySettings();

  if (settings.authorizedReceivers.includes(name)) {
    throw new Error('This person is already an authorized receiver');
  }

  return prisma.companySettings.update({
    where: { id: settings.id },
    data: {
      authorizedReceivers: {
        push: name,
      },
      updatedBy,
    },
  });
}

export async function removeAuthorizedReceiver(name: string, updatedBy: string) {
  const settings = await getCompanySettings();

  const updatedReceivers = settings.authorizedReceivers.filter((r) => r !== name);

  return prisma.companySettings.update({
    where: { id: settings.id },
    data: {
      authorizedReceivers: updatedReceivers,
      updatedBy,
    },
  });
}

// Email notification helpers
async function sendDeliveryInstructionsEmail(custodyDoc: any) {
  const settings = await getCompanySettings();

  for (const party of custodyDoc.deal.parties) {
    await emailSendingQueue.add(
      'send-document-delivery-instructions',
      {
        to: party.contactEmail,
        subject: `Document Delivery Instructions - Deal ${custodyDoc.deal.dealNumber}`,
        template: 'document-delivery-instructions',
        variables: {
          partyName: party.name,
          dealNumber: custodyDoc.deal.dealNumber,
          dealTitle: custodyDoc.deal.title,
          documentType: custodyDoc.documentType,
          documentDescription: custodyDoc.description,
          officeAddress: settings.officeAddress,
          officeAddressLine2: settings.officeAddressLine2,
          city: settings.city,
          country: settings.country,
          officePhone: settings.officePhone,
          officeHours: settings.officeHours,
          authorizedReceiverName: custodyDoc.authorizedReceiverName,
          deliveryMethod: custodyDoc.deliveryMethod,
        },
        dealId: custodyDoc.dealId,
        priority: 5,
      },
      { priority: 5 }
    );
  }
}

async function sendReceiptConfirmationEmail(custodyDoc: any) {
  for (const party of custodyDoc.deal.parties) {
    await emailSendingQueue.add(
      'send-document-receipt-confirmation',
      {
        to: party.contactEmail,
        subject: `✅ Document Received - Deal ${custodyDoc.deal.dealNumber}`,
        template: 'document-receipt-confirmation',
        variables: {
          partyName: party.name,
          dealNumber: custodyDoc.deal.dealNumber,
          documentType: custodyDoc.documentType,
          receivedBy: custodyDoc.actualReceiverName,
          receivedDate: custodyDoc.receivedDate,
        },
        dealId: custodyDoc.dealId,
        priority: 5,
      },
      { priority: 5 }
    );
  }
}

async function sendDeliveryRefusalEmail(custodyDoc: any) {
  const settings = await getCompanySettings();

  for (const party of custodyDoc.deal.parties) {
    await emailSendingQueue.add(
      'send-document-delivery-refusal',
      {
        to: party.contactEmail,
        subject: `⚠️ Document Delivery Refused - Deal ${custodyDoc.deal.dealNumber}`,
        template: 'document-delivery-refusal',
        variables: {
          partyName: party.name,
          dealNumber: custodyDoc.deal.dealNumber,
          documentType: custodyDoc.documentType,
          refusalReason: custodyDoc.refusalReason,
          refusalNotes: custodyDoc.refusalNotes,
          officeAddress: settings.officeAddress,
          officePhone: settings.officePhone,
          officeHours: settings.officeHours,
          authorizedReceiverName: custodyDoc.authorizedReceiverName,
        },
        dealId: custodyDoc.dealId,
        priority: 8, // High priority for refusals
      },
      { priority: 8 }
    );
  }
}
