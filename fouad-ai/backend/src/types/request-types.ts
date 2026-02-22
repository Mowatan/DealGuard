/**
 * Request Type Definitions
 * Centralizes all request body/query/param types for type safety
 */

import { DealStatus } from '@prisma/client';

// ============================================================================
// DEAL REQUEST TYPES
// ============================================================================

export interface DealQueryParams {
  status?: DealStatus;
  page?: string;
  limit?: string;
}

export interface UpdateDealStatusBody {
  status: DealStatus;
  actorId?: string;
}

export interface AmendmentResponseBody {
  response: 'APPROVE' | 'REJECT';
  notes?: string;
}

export interface DeletionResponseBody {
  response: 'APPROVE' | 'REJECT';
  notes?: string;
}

export interface ResolveDeletionBody {
  decision: 'APPROVE' | 'REJECT';
  resolutionNotes: string;
}

export interface ResolveAmendmentBody {
  decision: 'APPROVE' | 'REJECT';
  resolutionNotes: string;
}

// ============================================================================
// MILESTONE REQUEST TYPES
// ============================================================================

export interface MilestoneResponseBody {
  responseType: 'ACCEPTED' | 'REJECTED' | 'AMENDMENT_PROPOSED';
  amendmentProposal?: {
    newAmount?: number;
    newDeadline?: string;
    newDescription?: string;
    reason: string;
  };
  notes?: string;
}

export interface ApproveMilestoneBody {
  approvedBy: string;
  notes?: string;
}

// ============================================================================
// INVITATION REQUEST TYPES
// ============================================================================

export interface AcceptInvitationBody {
  userId: string;
}

export interface DeclineInvitationBody {
  reason?: string;
}

// ============================================================================
// EVIDENCE REQUEST TYPES
// ============================================================================

export interface SubmitEvidenceBody {
  milestoneId: string;
  description: string;
  evidenceType: string;
  fileIds: string[];
}

export interface ReviewEvidenceBody {
  status: 'APPROVED' | 'REJECTED' | 'QUARANTINED';
  reviewNotes?: string;
}

// ============================================================================
// CUSTODY REQUEST TYPES
// ============================================================================

export interface SubmitFundingBody {
  amount: number;
  currency: string;
  transactionHash?: string;
  blockchainNetwork?: string;
  paymentMethod: string;
}

export interface VerifyFundingBody {
  verified: boolean;
  verificationNotes?: string;
}

export interface AuthorizeReleaseBody {
  milestoneId: string;
  amount: number;
  notes?: string;
}

// ============================================================================
// GENERIC TYPES
// ============================================================================

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface IdParam {
  id: string;
}

export interface TokenParam {
  token: string;
}
