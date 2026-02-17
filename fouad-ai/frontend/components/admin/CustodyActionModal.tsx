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
import { custodyApi } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';
import { formatNumber } from '@/lib/utils';

interface CustodyActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  action: 'verify' | 'release' | 'return';
  amount?: string;
  currency?: string;
  onSuccess: () => void;
}

export function CustodyActionModal({
  isOpen,
  onClose,
  recordId,
  action,
  amount,
  currency,
  onSuccess,
}: CustodyActionModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const titles = {
    verify: 'Verify Funding',
    release: 'Authorize Release',
    return: 'Authorize Return',
  };

  const messages = {
    verify: 'Confirm that you have verified the funding proof and the funds are held in custody.',
    release: 'Authorize the release of funds to the designated payee. This action cannot be undone.',
    return: 'Authorize the return of funds to the payer. This action cannot be undone.',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (action === 'verify') {
        await custodyApi.verify(recordId);
        toast({
          title: 'Success',
          description: 'Funding verified successfully!',
          variant: 'default',
        });
      } else {
        await custodyApi.authorize(recordId, action === 'release' ? 'RELEASE' : 'RETURN');
        toast({
          title: 'Success',
          description: `${action === 'release' ? 'Release' : 'Return'} authorized successfully!`,
          variant: 'default',
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} custody`,
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
          <DialogTitle>{titles[action]}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {amount && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Amount</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(amount)} {currency || 'EGP'}
              </p>
            </div>
          )}

          <div className={`p-4 rounded-lg ${
            action === 'verify'
              ? 'bg-blue-50 border border-blue-200'
              : action === 'release'
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className={`text-sm ${
              action === 'verify'
                ? 'text-blue-800'
                : action === 'release'
                ? 'text-green-800'
                : 'text-yellow-800'
            }`}>
              <strong>Warning:</strong> {messages[action]}
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              This action will be logged in the audit trail and blockchain. Ensure you have proper authorization.
            </p>
          </div>

          <DialogFooter className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={action === 'return' ? 'destructive' : 'default'}
              disabled={loading}
            >
              {loading ? 'Confirming...' : `Confirm ${titles[action]}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
