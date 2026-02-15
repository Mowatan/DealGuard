import { TransactionType, ServiceTier } from '@prisma/client';

export interface StageDefinition {
  key: string;
  name: string;
  description: string;
  order: number;
  actorType: 'PARTY' | 'ADMIN' | 'ESCROW_OFFICER' | 'SYSTEM';
  estimatedDuration?: string;
  icon?: string;
}

// TIER 1 (8 stages - no escrow officer)
export const TIER1_SIMPLE_STAGES: StageDefinition[] = [
  {
    key: 'DEAL_CREATED',
    name: 'Deal Created',
    description: 'Deal has been initiated',
    order: 1,
    actorType: 'PARTY',
    icon: 'FileText'
  },
  {
    key: 'PARTY_INVITATION',
    name: 'Party Invitation',
    description: 'Inviting parties to accept deal terms',
    order: 2,
    actorType: 'PARTY',
    estimatedDuration: '1-2 days',
    icon: 'Mail'
  },
  {
    key: 'PARTIES_ACCEPTED',
    name: 'All Parties Accepted',
    description: 'All parties have confirmed participation',
    order: 3,
    actorType: 'PARTY',
    icon: 'CheckCircle'
  },
  {
    key: 'KYC_VERIFICATION',
    name: 'KYC Verification',
    description: 'Identity verification in progress',
    order: 4,
    actorType: 'ADMIN',
    estimatedDuration: '1-3 days',
    icon: 'Shield'
  },
  {
    key: 'FUNDING_SUBMITTED',
    name: 'Funding Proof Submitted',
    description: 'Party submitted proof of funds',
    order: 5,
    actorType: 'PARTY',
    icon: 'DollarSign'
  },
  {
    key: 'DEAL_IN_PROGRESS',
    name: 'Deal In Progress',
    description: 'Parties executing transaction',
    order: 6,
    actorType: 'PARTY',
    icon: 'Activity'
  },
  {
    key: 'EVIDENCE_REVIEW',
    name: 'Evidence Review',
    description: 'Admin reviewing completion evidence',
    order: 7,
    actorType: 'ADMIN',
    estimatedDuration: '1-2 days',
    icon: 'FileSearch'
  },
  {
    key: 'DEAL_COMPLETED',
    name: 'Deal Completed',
    description: 'Transaction successfully completed',
    order: 8,
    actorType: 'SYSTEM',
    icon: 'CheckCircle2'
  }
];

// TIER 2/3 (15 stages - with escrow officer)
export const TIER2_SIMPLE_STAGES: StageDefinition[] = [
  {
    key: 'DEAL_CREATED',
    name: 'Deal Created',
    description: 'Deal has been initiated',
    order: 1,
    actorType: 'PARTY',
    icon: 'FileText'
  },
  {
    key: 'PARTY_INVITATION',
    name: 'Party Invitation',
    description: 'Inviting parties to accept deal terms',
    order: 2,
    actorType: 'PARTY',
    estimatedDuration: '1-2 days',
    icon: 'Mail'
  },
  {
    key: 'PARTIES_ACCEPTED',
    name: 'All Parties Accepted',
    description: 'All parties have confirmed participation',
    order: 3,
    actorType: 'PARTY',
    icon: 'CheckCircle'
  },
  {
    key: 'ESCROW_OFFICER_ASSIGNED',
    name: 'Escrow Officer Assigned',
    description: 'Dedicated escrow officer assigned to oversee this deal',
    order: 4,
    actorType: 'ADMIN',
    icon: 'UserCheck'
  },
  {
    key: 'DOCUMENT_DELIVERY_INSTRUCTIONS',
    name: 'Document Delivery Instructions Sent',
    description: 'Parties notified of document delivery requirements',
    order: 5,
    actorType: 'ESCROW_OFFICER',
    icon: 'Package'
  },
  {
    key: 'DOCUMENTS_IN_TRANSIT',
    name: 'Documents In Transit',
    description: 'Physical documents being delivered to vault',
    order: 6,
    actorType: 'PARTY',
    estimatedDuration: '2-5 days',
    icon: 'Truck'
  },
  {
    key: 'DOCUMENTS_RECEIVED',
    name: 'Documents Received',
    description: 'Escrow officer has received and verified documents',
    order: 7,
    actorType: 'ESCROW_OFFICER',
    icon: 'PackageCheck'
  },
  {
    key: 'DOCUMENTS_IN_CUSTODY',
    name: 'Documents Secured in Vault',
    description: 'Documents safely stored in secure custody',
    order: 8,
    actorType: 'ESCROW_OFFICER',
    icon: 'Lock'
  },
  {
    key: 'KYC_VERIFICATION',
    name: 'KYC Verification',
    description: 'Identity verification in progress',
    order: 9,
    actorType: 'ADMIN',
    estimatedDuration: '1-3 days',
    icon: 'Shield'
  },
  {
    key: 'FUNDING_SUBMITTED',
    name: 'Funding Proof Submitted',
    description: 'Party submitted proof of funds',
    order: 10,
    actorType: 'PARTY',
    icon: 'DollarSign'
  },
  {
    key: 'FUNDING_VERIFIED',
    name: 'Funding Verified',
    description: 'Escrow officer confirmed funds held',
    order: 11,
    actorType: 'ESCROW_OFFICER',
    icon: 'BadgeCheck'
  },
  {
    key: 'DEAL_IN_PROGRESS',
    name: 'Deal In Progress',
    description: 'Parties executing transaction',
    order: 12,
    actorType: 'PARTY',
    icon: 'Activity'
  },
  {
    key: 'EVIDENCE_REVIEW',
    name: 'Evidence Review',
    description: 'Escrow officer reviewing completion evidence',
    order: 13,
    actorType: 'ESCROW_OFFICER',
    estimatedDuration: '1-2 days',
    icon: 'FileSearch'
  },
  {
    key: 'RELEASE_AUTHORIZED',
    name: 'Release Authorized',
    description: 'Escrow officer authorized release of documents/funds',
    order: 14,
    actorType: 'ESCROW_OFFICER',
    icon: 'Unlock'
  },
  {
    key: 'DEAL_COMPLETED',
    name: 'Deal Completed',
    description: 'Transaction successfully completed',
    order: 15,
    actorType: 'SYSTEM',
    icon: 'CheckCircle2'
  }
];

// Factory function to get stages for a deal
export function getStagesForDeal(
  transactionType: TransactionType,
  serviceTier: ServiceTier
): StageDefinition[] {
  if (transactionType === 'SIMPLE') {
    if (serviceTier === 'GOVERNANCE_ADVISORY') {
      return TIER1_SIMPLE_STAGES;
    } else {
      // DOCUMENT_CUSTODY or FINANCIAL_ESCROW
      return TIER2_SIMPLE_STAGES;
    }
  } else {
    // MILESTONE_BASED - will be handled in Phase 3
    return [];
  }
}

// Helper function to determine if escrow officer is required
export function requiresEscrowOfficer(
  transactionType: TransactionType,
  serviceTier: ServiceTier
): boolean {
  if (transactionType === 'MILESTONE_BASED') {
    return true; // All milestone-based deals require escrow officer
  }

  return serviceTier !== 'GOVERNANCE_ADVISORY'; // Tier 2 and 3 require escrow officer
}
