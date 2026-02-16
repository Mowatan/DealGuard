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
import { dealsApi } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await dealsApi.updateStatus(dealId, newStatus);
      toast({
        title: 'Success',
        description: 'Deal status updated successfully!',
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Deal Status</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>
              Current Status: <span className="font-semibold">{currentStatus.replace(/_/g, ' ')}</span>
            </Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Updating the deal status will be logged in the audit trail.
              Make sure this change is authorized.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
