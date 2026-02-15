'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, FileEdit } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface ProposeAmendmentModalProps {
  dealId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProposeAmendmentModal({
  dealId,
  open,
  onOpenChange,
  onSuccess,
}: ProposeAmendmentModalProps) {
  const [amendmentType, setAmendmentType] = useState('update_terms');
  const [description, setDescription] = useState('');
  const [changesJson, setChangesJson] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amendmentTypes = [
    { value: 'add_party', label: 'Add Party', example: '{"parties": {"add": ["new@email.com"]}}' },
    { value: 'remove_party', label: 'Remove Party', example: '{"parties": {"remove": ["party-id"]}}' },
    { value: 'update_terms', label: 'Update Deal Terms', example: '{"title": "New Title", "totalAmount": 15000}' },
    { value: 'change_milestone', label: 'Change Milestone', example: '{"milestones": {"1": {"deadline": "2026-03-15"}}}' },
    { value: 'update_payment', label: 'Update Payment Schedule', example: '{"paymentSchedule": {"finalDate": "2026-04-01"}}' },
    { value: 'other', label: 'Other', example: '{"customField": "value"}' },
  ];

  const selectedType = amendmentTypes.find(t => t.value === amendmentType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim() || !reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    let proposedChanges: any = {};

    if (changesJson.trim()) {
      try {
        proposedChanges = JSON.parse(changesJson);
      } catch (err) {
        toast.error('Invalid JSON format in changes field');
        return;
      }
    }

    // Add metadata
    proposedChanges._amendmentType = amendmentType;
    proposedChanges._description = description;
    proposedChanges._reason = reason;

    setIsSubmitting(true);

    try {
      await apiClient.post(`/deals/${dealId}/amendments`, {
        proposedChanges,
      });

      toast.success('Amendment proposed successfully', {
        description: 'All parties will be notified to review and respond.',
      });

      // Reset form
      setDescription('');
      setChangesJson('');
      setReason('');
      setAmendmentType('update_terms');

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to propose amendment:', error);
      toast.error('Failed to propose amendment', {
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
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            Propose Amendment to Deal
          </DialogTitle>
          <DialogDescription>
            Propose changes to this deal. All parties must approve before changes take effect.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amendment Type */}
          <div className="space-y-3">
            <Label>Amendment Type</Label>
            <RadioGroup value={amendmentType} onValueChange={setAmendmentType}>
              {amendmentTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="font-normal cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Briefly describe what you want to change..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Changes JSON */}
          <div className="space-y-2">
            <Label htmlFor="changes">Changes (JSON format)</Label>
            <Textarea
              id="changes"
              placeholder={selectedType?.example}
              value={changesJson}
              onChange={(e) => setChangesJson(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Provide structured changes in JSON format. Example shown above.
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Amendment <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Explain why this amendment is necessary..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              Examples: Deal fell through, Parties agreed to new terms, Bank processing delays, etc.
            </p>
          </div>

          {/* Info Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">All parties must approve</p>
              <p>
                This amendment will be sent to all parties for review. If any party disputes it,
                the matter will be escalated to DealGuard administration for resolution.
              </p>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Proposing...' : 'Propose Amendment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
