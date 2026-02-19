'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

interface DealActionButtonsProps {
  dealId: string;
  dealStatus: string;
  isCreator: boolean;
  allPartiesAccepted: boolean;
}

export function DealActionButtons({
  dealId,
  dealStatus,
  isCreator,
  allPartiesAccepted,
}: DealActionButtonsProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Only show buttons if user is creator and deal hasn't been accepted yet
  if (!isCreator || dealStatus === 'ACCEPTED' || dealStatus === 'CANCELLED' || allPartiesAccepted) {
    return null;
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setCancelling(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/deals/${dealId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: cancelReason }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel deal');
      }

      alert('Deal cancelled successfully');
      router.refresh();
      setShowCancelModal(false);
    } catch (error) {
      console.error('Error cancelling deal:', error);
      alert(error instanceof Error ? error.message : 'Failed to cancel deal');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => alert('Amendment feature coming soon')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Amend Deal
        </button>

        <button
          onClick={() => setShowCancelModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Cancel Deal
        </button>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Cancel Deal</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for cancelling this deal. All parties will be notified.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
