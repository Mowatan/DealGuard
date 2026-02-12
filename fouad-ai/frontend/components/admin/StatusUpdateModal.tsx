'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { dealsApi } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  currentStatus: string;
  onSuccess: () => void;
}

const STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PROPOSED', label: 'Proposed' },
  { value: 'ACCEPTED_BY_ALL', label: 'Accepted by All' },
  { value: 'SIGNED_RECORDED', label: 'Signed & Recorded' },
  { value: 'FUNDED_VERIFIED', label: 'Funded & Verified' },
  { value: 'IN_VERIFICATION', label: 'In Verification' },
  { value: 'RELEASE_AUTHORIZED', label: 'Release Authorized' },
  { value: 'RELEASE_CONFIRMED', label: 'Release Confirmed' },
  { value: 'RETURN_AUTHORIZED', label: 'Return Authorized' },
  { value: 'RETURN_CONFIRMED', label: 'Return Confirmed' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function StatusUpdateModal({ isOpen, onClose, dealId, currentStatus, onSuccess }: StatusUpdateModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await dealsApi.updateStatus(dealId, newStatus);
      showToast('success', 'Deal status updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast('error', error.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Deal Status" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Status: <span className="font-semibold">{currentStatus.replace(/_/g, ' ')}</span>
          </label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Updating the deal status will be logged in the audit trail.
            Make sure this change is authorized.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Update Status
          </Button>
        </div>
      </form>
    </Modal>
  );
}
