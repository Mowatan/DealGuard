'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface Amendment {
  id: string;
  proposedBy: string;
  proposedByName: string;
  status: string;
  proposedChanges: any;
  createdAt: string;
}

interface AmendmentApprovalModalProps {
  dealId: string;
  amendment: Amendment;
  currentUserPartyId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AmendmentApprovalModal({
  dealId,
  amendment,
  currentUserPartyId,
  open,
  onOpenChange,
  onSuccess,
}: AmendmentApprovalModalProps) {
  const [responseType, setResponseType] = useState<'APPROVE' | 'DISPUTE'>('APPROVE');
  const [notes, setNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAmendmentType = (changes: any): string => {
    if (changes._amendmentType) {
      return changes._amendmentType
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return 'Amendment';
  };

  const getChangeSummary = (changes: any): string[] => {
    const summary: string[] = [];

    // Extract actual changes (excluding metadata)
    Object.keys(changes).forEach((key) => {
      if (!key.startsWith('_')) {
        const value = changes[key];
        if (typeof value === 'object') {
          summary.push(`${key}: ${JSON.stringify(value, null, 2)}`);
        } else {
          summary.push(`${key}: ${value}`);
        }
      }
    });

    if (summary.length === 0) {
      summary.push('See full description for details');
    }

    return summary;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserPartyId) {
      toast.error('You are not authorized to respond to this amendment');
      return;
    }

    if (responseType === 'DISPUTE' && !disputeReason.trim()) {
      toast.error('Please provide a reason for disputing');
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint =
        responseType === 'APPROVE'
          ? `/amendments/${amendment.id}/approve`
          : `/amendments/${amendment.id}/dispute`;

      await apiClient.post(endpoint, {
        partyId: currentUserPartyId,
        notes: responseType === 'DISPUTE' ? disputeReason : notes || undefined,
      });

      toast.success(
        responseType === 'APPROVE' ? 'Amendment approved' : 'Amendment disputed',
        {
          description:
            responseType === 'APPROVE'
              ? 'Your approval has been recorded'
              : 'Your dispute has been escalated to admin review',
        }
      );

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to respond to amendment:', error);
      toast.error('Failed to submit response', {
        description: error.response?.data?.error || 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Respond to Amendment</DialogTitle>
          <DialogDescription>
            Review the proposed changes and provide your response
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amendment Details */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Amendment Type:</p>
              <p className="text-sm text-slate-900">
                {getAmendmentType(amendment.proposedChanges)}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700">Proposed by:</p>
              <p className="text-sm text-slate-900">{amendment.proposedByName}</p>
            </div>

            {amendment.proposedChanges._description && (
              <div>
                <p className="text-sm font-semibold text-slate-700">Description:</p>
                <p className="text-sm text-slate-900">
                  {amendment.proposedChanges._description}
                </p>
              </div>
            )}

            {amendment.proposedChanges._reason && (
              <div>
                <p className="text-sm font-semibold text-slate-700">Reason:</p>
                <p className="text-sm text-slate-900">{amendment.proposedChanges._reason}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Changes:</p>
              <ul className="list-disc list-inside space-y-1">
                {getChangeSummary(amendment.proposedChanges).map((change, idx) => (
                  <li key={idx} className="text-sm text-slate-900">
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Response Type */}
          <div className="space-y-3">
            <Label>Your Response</Label>
            <RadioGroup
              value={responseType}
              onValueChange={(value) => setResponseType(value as 'APPROVE' | 'DISPUTE')}
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-green-50 transition-colors">
                <RadioGroupItem value="APPROVE" id="approve" />
                <Label
                  htmlFor="approve"
                  className="font-normal cursor-pointer flex items-center gap-2 flex-1"
                >
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Approve this amendment</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-red-50 transition-colors">
                <RadioGroupItem value="DISPUTE" id="dispute" />
                <Label
                  htmlFor="dispute"
                  className="font-normal cursor-pointer flex items-center gap-2 flex-1"
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Dispute this amendment</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Dispute Reason */}
          {responseType === 'DISPUTE' && (
            <div className="space-y-2">
              <Label htmlFor="disputeReason">
                Reason for Dispute <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="disputeReason"
                placeholder="Explain why you are disputing this amendment..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={4}
                required={responseType === 'DISPUTE'}
              />
              <p className="text-xs text-muted-foreground">
                This will be escalated to DealGuard administration for review
              </p>
            </div>
          )}

          {/* Optional Notes */}
          {responseType === 'APPROVE' && (
            <div className="space-y-2">
              <Label htmlFor="notes">Optional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any comments or conditions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Info Alert */}
          <div
            className={`rounded-lg p-4 flex gap-3 ${
              responseType === 'APPROVE'
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-orange-50 border border-orange-200'
            }`}
          >
            <AlertCircle
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                responseType === 'APPROVE' ? 'text-blue-600' : 'text-orange-600'
              }`}
            />
            <div className="text-sm">
              {responseType === 'APPROVE' ? (
                <>
                  <p className="font-semibold text-blue-900 mb-1">Approval</p>
                  <p className="text-blue-800">
                    If all parties approve, this amendment will be automatically applied to the deal.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-orange-900 mb-1">Dispute</p>
                  <p className="text-orange-800">
                    This amendment will be sent to DealGuard administration for review and resolution.
                    The changes will not be applied until the dispute is resolved.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant={responseType === 'APPROVE' ? 'default' : 'destructive'}
            >
              {isSubmitting
                ? 'Submitting...'
                : responseType === 'APPROVE'
                ? 'Approve Amendment'
                : 'Dispute Amendment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
