'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { evidenceApi } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';

interface EvidenceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidenceId: string;
  action: 'APPROVED' | 'REJECTED';
  onSuccess: () => void;
}

export function EvidenceReviewModal({ isOpen, onClose, evidenceId, action, onSuccess }: EvidenceReviewModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await evidenceApi.review(evidenceId, {
        status: action,
        reviewNotes: notes,
      });

      toast({
        title: 'Success',
        description: `Evidence ${action.toLowerCase()} successfully!`,
        variant: 'default',
      });
      onSuccess();
      onClose();
      setNotes('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to review evidence',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{`${action === 'APPROVED' ? 'Approve' : 'Reject'} Evidence`}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`p-4 rounded-lg ${action === 'APPROVED' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-sm ${action === 'APPROVED' ? 'text-green-800' : 'text-red-800'}`}>
              {action === 'APPROVED'
                ? 'You are about to approve this evidence. This will mark it as verified and may trigger milestone completion.'
                : 'You are about to reject this evidence. The party will need to resubmit with corrections.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-notes">Review Notes</Label>
            <Textarea
              id="review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={action === 'APPROVED' ? 'Optional notes...' : 'Please explain why this evidence is being rejected...'}
              rows={4}
              required={action === 'REJECTED'}
            />
          </div>

          <DialogFooter className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={action === 'APPROVED' ? 'default' : 'destructive'}
              disabled={loading}
            >
              {loading ? 'Processing...' : `${action === 'APPROVED' ? 'Approve' : 'Reject'} Evidence`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
