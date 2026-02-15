'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, XCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface DeleteDealButtonProps {
  dealId: string;
  dealNumber: string;
  dealStatus: string;
  hasCustodyItems: boolean;
  hasEscrowFunds: boolean;
  activeMilestonesCount: number;
  onSuccess?: () => void;
}

export function DeleteDealButton({
  dealId,
  dealNumber,
  dealStatus,
  hasCustodyItems,
  hasEscrowFunds,
  activeMilestonesCount,
  onSuccess,
}: DeleteDealButtonProps) {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canDelete = !hasCustodyItems && !hasEscrowFunds && activeMilestonesCount === 0;

  const handleDeleteRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error('Please provide a reason for deletion');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post(`/deals/${dealId}/deletion-request`, {
        reason,
      });

      toast.success('Deletion request submitted', {
        description: 'All parties will be notified to review and respond.',
      });

      setReason('');
      setConfirmModalOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to request deletion:', error);
      toast.error('Failed to request deletion', {
        description: error.response?.data?.error || 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setConfirmModalOpen(true)}
        className="gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Request Deal Deletion
      </Button>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Request Deal Deletion
            </DialogTitle>
            <DialogDescription>
              {canDelete
                ? 'This action requires approval from ALL parties.'
                : 'This deal cannot be deleted at this time.'}
            </DialogDescription>
          </DialogHeader>

          {canDelete ? (
            <form onSubmit={handleDeleteRequest} className="space-y-6">
              {/* Safety Checklist */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-green-900 mb-2">✓ Current Status:</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Documents in custody: NO ✓</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Funds in escrow: NO ✓</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Active milestones: 0 ✓</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-green-800 mt-3">
                  Status: Safe to delete if all parties agree
                </p>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason for Deletion <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why this deal should be deleted..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Examples: Deal fell through, Parties agreed to cancel, Created by mistake, etc.
                </p>
              </div>

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-semibold mb-1">Important</p>
                  <p>
                    This deletion request will be sent to all parties. If any party disputes it,
                    the matter will be escalated to DealGuard administration. All parties must
                    approve before the deal can be deleted.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Request Deletion'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Blockers */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <p className="font-semibold text-red-900">
                  This deal cannot be deleted because:
                </p>
                <div className="space-y-2 text-sm">
                  {hasCustodyItems && (
                    <div className="flex items-center gap-2 text-red-800">
                      <XCircle className="w-4 h-4" />
                      <span>Documents are in custody</span>
                    </div>
                  )}
                  {hasEscrowFunds && (
                    <div className="flex items-center gap-2 text-red-800">
                      <XCircle className="w-4 h-4" />
                      <span>Funds in escrow</span>
                    </div>
                  )}
                  {activeMilestonesCount > 0 && (
                    <div className="flex items-center gap-2 text-red-800">
                      <XCircle className="w-4 h-4" />
                      <span>Active milestones: {activeMilestonesCount}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Required Actions */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="font-semibold text-orange-900 mb-2">
                  Required actions before deletion:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-sm text-orange-800">
                  {hasCustodyItems && <li>Release or return all custody documents</li>}
                  {hasEscrowFunds && <li>Disburse or refund all escrow funds</li>}
                  {activeMilestonesCount > 0 && (
                    <li>Complete or cancel all active milestones</li>
                  )}
                </ol>
              </div>

              {/* Contact Info */}
              <div className="text-center text-sm text-muted-foreground">
                <p>Need assistance? Contact DealGuard administration:</p>
                <p className="font-semibold text-slate-900 mt-1">admin@dealguard.org</p>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
