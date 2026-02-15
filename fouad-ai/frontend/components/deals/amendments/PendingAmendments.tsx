'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { AmendmentApprovalModal } from './AmendmentApprovalModal';

interface Amendment {
  id: string;
  proposedBy: string;
  proposedByName: string;
  status: string;
  proposedChanges: any;
  createdAt: string;
  responses: Array<{
    id: string;
    partyId: string;
    party: {
      name: string;
      role: string;
    };
    responseType: string;
    notes?: string;
    respondedAt: string;
  }>;
}

interface PendingAmendmentsProps {
  dealId: string;
  amendments: Amendment[];
  parties: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  currentUserId?: string;
  currentUserPartyId?: string;
  onRefresh: () => void;
}

export function PendingAmendments({
  dealId,
  amendments,
  parties,
  currentUserId,
  currentUserPartyId,
  onRefresh,
}: PendingAmendmentsProps) {
  const [selectedAmendment, setSelectedAmendment] = useState<Amendment | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);

  if (!amendments || amendments.length === 0) {
    return null;
  }

  const getStatusBadge = (amendment: Amendment) => {
    switch (amendment.status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'DISPUTED':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Disputed
          </Badge>
        );
      case 'APPLIED':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Applied
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{amendment.status}</Badge>;
    }
  };

  const getApprovalStatus = (amendment: Amendment) => {
    const totalParties = parties.length;
    const approvedCount = amendment.responses.filter((r) => r.responseType === 'APPROVE').length;

    return `${approvedCount}/${totalParties} approvals`;
  };

  const hasUserResponded = (amendment: Amendment) => {
    if (!currentUserPartyId) return false;
    return amendment.responses.some((r) => r.partyId === currentUserPartyId);
  };

  const getAmendmentType = (changes: any): string => {
    if (changes._amendmentType) {
      const type = changes._amendmentType;
      return type
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return 'Amendment';
  };

  const getAmendmentDescription = (changes: any): string => {
    return changes._description || 'No description provided';
  };

  const getDisputeReason = (amendment: Amendment): string | null => {
    const dispute = amendment.responses.find((r) => r.responseType === 'DISPUTE');
    return dispute?.notes || null;
  };

  const handleOpenApprovalModal = (amendment: Amendment) => {
    setSelectedAmendment(amendment);
    setApprovalModalOpen(true);
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Pending Amendments ({amendments.length})
          </h3>
        </div>

        <div className="space-y-6">
          {amendments.map((amendment, index) => (
            <div key={amendment.id}>
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">Amendment #{index + 1}</h4>
                      {getStatusBadge(amendment)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Proposed by: {amendment.proposedByName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Type: {getAmendmentType(amendment.proposedChanges)}
                    </p>
                    {amendment.status === 'PENDING' && (
                      <p className="text-sm font-medium text-blue-600 mt-1">
                        Status: {getApprovalStatus(amendment)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-semibold mb-1">Description:</p>
                  <p className="text-sm text-slate-700">
                    "{getAmendmentDescription(amendment.proposedChanges)}"
                  </p>
                </div>

                {/* Approvals */}
                {amendment.status !== 'APPLIED' && amendment.status !== 'REJECTED' && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Approvals:</p>
                    <div className="space-y-2">
                      {parties.map((party) => {
                        const response = amendment.responses.find((r) => r.partyId === party.id);

                        return (
                          <div key={party.id} className="flex items-center gap-2 text-sm">
                            {response?.responseType === 'APPROVE' ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-green-700">
                                  {party.name} ({party.role}) - Approved
                                </span>
                              </>
                            ) : response?.responseType === 'DISPUTE' ? (
                              <>
                                <XCircle className="w-4 h-4 text-red-600" />
                                <span className="text-red-700">
                                  {party.name} ({party.role}) - Disputed
                                </span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 text-yellow-600" />
                                <span className="text-muted-foreground">
                                  {party.name} ({party.role}) - Awaiting response
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dispute Reason */}
                {amendment.status === 'DISPUTED' && getDisputeReason(amendment) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-red-900 mb-1">
                      Dispute Reason:
                    </p>
                    <p className="text-sm text-red-800">"{getDisputeReason(amendment)}"</p>
                    <p className="text-sm text-red-700 mt-2 font-medium">
                      Status: Awaiting Admin Resolution
                    </p>
                  </div>
                )}

                {/* Actions */}
                {amendment.status === 'PENDING' &&
                  currentUserPartyId &&
                  !hasUserResponded(amendment) && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleOpenApprovalModal(amendment)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleOpenApprovalModal(amendment)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Dispute
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenApprovalModal(amendment)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  )}

                {amendment.status === 'PENDING' &&
                  currentUserPartyId &&
                  hasUserResponded(amendment) && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ You have already responded to this amendment
                    </p>
                  )}
              </div>

              {index < amendments.length - 1 && <hr className="my-6 border-slate-200" />}
            </div>
          ))}
        </div>
      </Card>

      {selectedAmendment && (
        <AmendmentApprovalModal
          dealId={dealId}
          amendment={selectedAmendment}
          currentUserPartyId={currentUserPartyId}
          open={approvalModalOpen}
          onOpenChange={setApprovalModalOpen}
          onSuccess={() => {
            onRefresh();
            setApprovalModalOpen(false);
          }}
        />
      )}
    </>
  );
}
