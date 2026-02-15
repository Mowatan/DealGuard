'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, XCircle, FileEdit, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface Amendment {
  id: string;
  dealId: string;
  deal: {
    dealNumber: string;
    title: string;
  };
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

export default function AdminAmendmentsPage() {
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmendment, setSelectedAmendment] = useState<Amendment | null>(null);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [resolutionType, setResolutionType] = useState<'APPROVE' | 'REJECT' | 'REQUEST_COMPROMISE'>('APPROVE');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAmendments();
  }, []);

  const fetchAmendments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/amendments/disputed');
      setAmendments(response.data);
    } catch (error) {
      console.error('Failed to fetch amendments:', error);
      toast.error('Failed to load amendments');
    } finally {
      setLoading(false);
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

  const getDisputeReason = (amendment: Amendment): string => {
    const dispute = amendment.responses.find((r) => r.responseType === 'DISPUTE');
    return dispute?.notes || 'No reason provided';
  };

  const getDisputingParty = (amendment: Amendment) => {
    const dispute = amendment.responses.find((r) => r.responseType === 'DISPUTE');
    return dispute?.party;
  };

  const handleOpenResolutionModal = (amendment: Amendment) => {
    setSelectedAmendment(amendment);
    setResolutionModalOpen(true);
    setResolutionNotes('');
    setResolutionType('APPROVE');
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAmendment) return;

    if (!resolutionNotes.trim()) {
      toast.error('Please provide resolution notes');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post(`/admin/amendments/${selectedAmendment.id}/resolve`, {
        resolutionType,
        notes: resolutionNotes,
      });

      toast.success('Amendment resolved', {
        description: `Amendment has been ${resolutionType.toLowerCase().replace('_', ' ')}`,
      });

      setResolutionModalOpen(false);
      setSelectedAmendment(null);
      fetchAmendments();
    } catch (error: any) {
      console.error('Failed to resolve amendment:', error);
      toast.error('Failed to resolve amendment', {
        description: error.response?.data?.error || 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Disputed Amendments</h1>
          <p className="text-muted-foreground">Loading amendments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Disputed Amendments</h1>
          <p className="text-muted-foreground">
            Review and resolve amendments that have been disputed by deal parties
          </p>
        </div>

        {amendments.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Disputed Amendments</h3>
            <p className="text-muted-foreground">
              All amendments are either pending party approval or have been resolved
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {amendments.map((amendment) => (
              <Card key={amendment.id} className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">
                          Deal {amendment.deal.dealNumber}: {amendment.deal.title}
                        </h3>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Disputed
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Amendment Type: {getAmendmentType(amendment.proposedChanges)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Proposed by: {amendment.proposedByName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Date: {new Date(amendment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Proposal Details */}
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-1">
                        Proposer's Reason:
                      </p>
                      <p className="text-sm text-slate-900">
                        "{amendment.proposedChanges._reason || 'No reason provided'}"
                      </p>
                    </div>

                    {amendment.proposedChanges._description && (
                      <div>
                        <p className="text-sm font-semibold text-slate-700 mb-1">Description:</p>
                        <p className="text-sm text-slate-900">
                          {amendment.proposedChanges._description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dispute Details */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-900 mb-1">
                          Disputed by: {getDisputingParty(amendment)?.name} (
                          {getDisputingParty(amendment)?.role})
                        </p>
                        <p className="text-sm text-red-800">
                          Reason: "{getDisputeReason(amendment)}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Party Responses */}
                  <div>
                    <p className="text-sm font-semibold mb-2">Party Responses:</p>
                    <div className="space-y-2">
                      {amendment.responses.map((response) => (
                        <div key={response.id} className="flex items-center gap-2 text-sm">
                          {response.responseType === 'APPROVE' ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-green-700">
                                {response.party.name} ({response.party.role}) - Approved
                              </span>
                            </>
                          ) : response.responseType === 'DISPUTE' ? (
                            <>
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span className="text-red-700">
                                {response.party.name} ({response.party.role}) - Disputed
                              </span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-yellow-600" />
                              <span className="text-muted-foreground">
                                {response.party.name} ({response.party.role}) - Pending
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-end pt-2">
                    <Button onClick={() => handleOpenResolutionModal(amendment)}>
                      <FileEdit className="w-4 h-4 mr-2" />
                      Resolve Dispute
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedAmendment && (
        <Dialog open={resolutionModalOpen} onOpenChange={setResolutionModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Resolve Amendment Dispute</DialogTitle>
              <DialogDescription>
                Provide your admin decision on this disputed amendment
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleResolve} className="space-y-6">
              {/* Amendment Summary */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <span className="font-semibold">Deal:</span> {selectedAmendment.deal.dealNumber} -{' '}
                  {selectedAmendment.deal.title}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Amendment Type:</span>{' '}
                  {getAmendmentType(selectedAmendment.proposedChanges)}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Proposed by:</span>{' '}
                  {selectedAmendment.proposedByName}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Disputed by:</span>{' '}
                  {getDisputingParty(selectedAmendment)?.name} (
                  {getDisputingParty(selectedAmendment)?.role})
                </p>
              </div>

              {/* Resolution Type */}
              <div className="space-y-3">
                <Label>Resolution Decision</Label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setResolutionType('APPROVE')}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                      resolutionType === 'APPROVE'
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-slate-900">Approve Amendment</p>
                        <p className="text-sm text-muted-foreground">
                          Override the dispute and apply the amendment
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolutionType('REJECT')}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                      resolutionType === 'REJECT'
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 hover:border-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-semibold text-slate-900">Reject Amendment</p>
                        <p className="text-sm text-muted-foreground">
                          Support the dispute and reject the proposed changes
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolutionType('REQUEST_COMPROMISE')}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                      resolutionType === 'REQUEST_COMPROMISE'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-semibold text-slate-900">Request Compromise</p>
                        <p className="text-sm text-muted-foreground">
                          Ask parties to negotiate and find middle ground
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Resolution Notes */}
              <div className="space-y-2">
                <Label htmlFor="resolutionNotes">
                  Resolution Notes <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="resolutionNotes"
                  placeholder="Explain your decision and any guidance for the parties..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  These notes will be shared with all parties involved in the deal
                </p>
              </div>

              {/* Info Alert */}
              <div
                className={`rounded-lg p-4 flex gap-3 border ${
                  resolutionType === 'APPROVE'
                    ? 'bg-green-50 border-green-200'
                    : resolutionType === 'REJECT'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <AlertTriangle
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    resolutionType === 'APPROVE'
                      ? 'text-green-600'
                      : resolutionType === 'REJECT'
                      ? 'text-red-600'
                      : 'text-blue-600'
                  }`}
                />
                <div className="text-sm">
                  <p className="font-semibold mb-1">
                    {resolutionType === 'APPROVE'
                      ? 'Approve Override'
                      : resolutionType === 'REJECT'
                      ? 'Reject Amendment'
                      : 'Request Compromise'}
                  </p>
                  <p
                    className={
                      resolutionType === 'APPROVE'
                        ? 'text-green-800'
                        : resolutionType === 'REJECT'
                        ? 'text-red-800'
                        : 'text-blue-800'
                    }
                  >
                    {resolutionType === 'APPROVE'
                      ? 'The amendment will be applied to the deal despite the dispute. All parties will be notified of your decision.'
                      : resolutionType === 'REJECT'
                      ? 'The amendment will be rejected and the deal will remain unchanged. All parties will be notified.'
                      : 'Both parties will be notified to negotiate a compromise solution. The amendment will remain in disputed status until resolved.'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResolutionModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant={
                    resolutionType === 'APPROVE'
                      ? 'default'
                      : resolutionType === 'REJECT'
                      ? 'destructive'
                      : 'outline'
                  }
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Resolution'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
