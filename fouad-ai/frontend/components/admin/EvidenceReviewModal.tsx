'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { evidenceApi } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';

interface EvidenceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidenceId: string;
  action: 'APPROVED' | 'REJECTED';
  onSuccess: () => void;
}

export function EvidenceReviewModal({ isOpen, onClose, evidenceId, action, onSuccess }: EvidenceReviewModalProps) {
  const { showToast } = useToast();
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

      showToast('success', `Evidence ${action.toLowerCase()} successfully!`);
      onSuccess();
      onClose();
      setNotes('');
    } catch (error: any) {
      showToast('error', error.message || 'Failed to review evidence');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${action === 'APPROVED' ? 'Approve' : 'Reject'} Evidence`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`p-4 rounded-lg ${action === 'APPROVED' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`text-sm ${action === 'APPROVED' ? 'text-green-800' : 'text-red-800'}`}>
            {action === 'APPROVED'
              ? 'You are about to approve this evidence. This will mark it as verified and may trigger milestone completion.'
              : 'You are about to reject this evidence. The party will need to resubmit with corrections.'}
          </p>
        </div>

        <Textarea
          label="Review Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={action === 'APPROVED' ? 'Optional notes...' : 'Please explain why this evidence is being rejected...'}
          rows={4}
          required={action === 'REJECTED'}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={action === 'APPROVED' ? 'primary' : 'danger'}
            loading={loading}
          >
            {action === 'APPROVED' ? 'Approve' : 'Reject'} Evidence
          </Button>
        </div>
      </form>
    </Modal>
  );
}
