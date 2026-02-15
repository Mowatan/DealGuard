'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileEdit,
  User,
  Calendar,
} from 'lucide-react';

interface Amendment {
  id: string;
  proposedBy: string;
  proposedByName: string;
  status: string;
  proposedChanges: any;
  createdAt: string;
  updatedAt: string;
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
  adminResolution?: {
    resolutionType: string;
    notes: string;
    resolvedAt: string;
    resolvedBy: string;
  };
}

interface AmendmentHistoryProps {
  amendments: Amendment[];
}

export function AmendmentHistory({ amendments }: AmendmentHistoryProps) {
  if (!amendments || amendments.length === 0) {
    return (
      <Card className="p-6 text-center">
        <FileEdit className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No amendment history</p>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'APPLIED':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'DISPUTED':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <FileEdit className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
      case 'APPLIED':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Applied
          </Badge>
        );
      case 'DISPUTED':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Disputed
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
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAmendmentType = (changes: any): string => {
    if (changes._amendmentType) {
      return changes._amendmentType
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return 'Amendment';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Sort amendments by date (newest first)
  const sortedAmendments = [...amendments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileEdit className="w-5 h-5" />
          Amendment History
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Complete timeline of all amendments and changes to this deal
        </p>
      </div>

      <div className="space-y-6">
        {sortedAmendments.map((amendment, index) => (
          <div key={amendment.id} className="relative">
            {/* Timeline Line */}
            {index < sortedAmendments.length - 1 && (
              <div className="absolute left-[22px] top-[48px] bottom-[-24px] w-0.5 bg-slate-200" />
            )}

            {/* Amendment Card */}
            <div className="flex gap-4">
              {/* Status Icon */}
              <div className="flex-shrink-0 w-11 h-11 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center z-10">
                {getStatusIcon(amendment.status)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">
                          {getAmendmentType(amendment.proposedChanges)}
                        </h4>
                        {getStatusBadge(amendment.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {amendment.proposedByName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(amendment.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {amendment.proposedChanges._description && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-1">Description:</p>
                      <p className="text-sm text-slate-900">
                        {amendment.proposedChanges._description}
                      </p>
                    </div>
                  )}

                  {/* Reason */}
                  {amendment.proposedChanges._reason && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-1">Reason:</p>
                      <p className="text-sm text-slate-900">
                        {amendment.proposedChanges._reason}
                      </p>
                    </div>
                  )}

                  {/* Party Responses */}
                  {amendment.responses && amendment.responses.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Party Responses:</p>
                      <div className="space-y-2">
                        {amendment.responses.map((response) => (
                          <div key={response.id} className="flex items-start gap-2 text-sm">
                            {response.responseType === 'APPROVE' ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <span className="text-green-700 font-medium">
                                    {response.party.name} ({response.party.role})
                                  </span>
                                  <span className="text-green-700"> approved</span>
                                  {response.notes && (
                                    <p className="text-xs text-slate-600 mt-1">
                                      Note: {response.notes}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDate(response.respondedAt)}
                                  </p>
                                </div>
                              </>
                            ) : response.responseType === 'DISPUTE' ? (
                              <>
                                <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <span className="text-red-700 font-medium">
                                    {response.party.name} ({response.party.role})
                                  </span>
                                  <span className="text-red-700"> disputed</span>
                                  {response.notes && (
                                    <p className="text-xs text-red-800 mt-1 font-medium">
                                      Reason: {response.notes}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDate(response.respondedAt)}
                                  </p>
                                </div>
                              </>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Resolution */}
                  {amendment.adminResolution && (
                    <div className="bg-white border-2 border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Admin Resolution
                      </p>
                      <p className="text-sm text-blue-800 mb-1">
                        <span className="font-medium">Decision:</span>{' '}
                        {amendment.adminResolution.resolutionType.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Notes:</span> {amendment.adminResolution.notes}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Resolved on {formatDate(amendment.adminResolution.resolvedAt)}
                      </p>
                    </div>
                  )}

                  {/* Applied Status */}
                  {amendment.status === 'APPLIED' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800">
                        This amendment was successfully applied to the deal on{' '}
                        {formatDate(amendment.updatedAt)}
                      </p>
                    </div>
                  )}

                  {/* Rejected Status */}
                  {amendment.status === 'REJECTED' && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-800">
                        This amendment was rejected and the deal remains unchanged
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
