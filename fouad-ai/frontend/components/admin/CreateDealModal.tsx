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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { dealsApi } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2 } from 'lucide-react';

interface Party {
  role: string;
  name: string;
  isOrganization: boolean;
  contactEmail: string;
  contactPhone?: string;
}

interface CreateDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CURRENCIES = [
  { value: 'EGP', label: 'EGP - Egyptian Pound' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
];

export function CreateDealModal({ isOpen, onClose, onSuccess }: CreateDealModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    currency: 'EGP',
    totalAmount: '',
  });
  const [parties, setParties] = useState<Party[]>([
    { role: 'BUYER', name: '', isOrganization: false, contactEmail: '', contactPhone: '' },
    { role: 'SELLER', name: '', isOrganization: false, contactEmail: '', contactPhone: '' },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        title: formData.title,
        description: formData.description,
        currency: formData.currency,
        parties: parties.filter(p => p.name && p.contactEmail),
      };

      if (formData.totalAmount && parseFloat(formData.totalAmount) > 0) {
        payload.totalAmount = parseFloat(formData.totalAmount);
      }

      await dealsApi.create(payload);

      toast({
        title: 'Success',
        description: 'Deal created successfully!',
        variant: 'default',
      });
      onSuccess();
      onClose();

      // Reset form
      setFormData({ title: '', description: '', currency: 'EGP', totalAmount: '' });
      setParties([
        { role: 'BUYER', name: '', isOrganization: false, contactEmail: '', contactPhone: '' },
        { role: 'SELLER', name: '', isOrganization: false, contactEmail: '', contactPhone: '' },
      ]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create deal',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addParty = () => {
    setParties([...parties, { role: 'OTHER', name: '', isOrganization: false, contactEmail: '', contactPhone: '' }]);
  };

  const removeParty = (index: number) => {
    setParties(parties.filter((_, i) => i !== index));
  };

  const updateParty = (index: number, field: keyof Party, value: any) => {
    const updated = [...parties];
    updated[index] = { ...updated[index], [field]: value };
    setParties(updated);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="deal-title">Deal Title</Label>
            <Input
              id="deal-title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Property Sale - Villa in New Cairo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-description">Description</Label>
            <Textarea
              id="deal-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the deal..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deal-currency">Currency</Label>
              <select
                id="deal-currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr.value} value={curr.value}>
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal-amount">Total Amount (Optional)</Label>
              <Input
                id="deal-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Parties (minimum 2)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addParty}>
                <Plus className="w-4 h-4 mr-1" />
                Add Party
              </Button>
            </div>

            <div className="space-y-4">
              {parties.map((party, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Party {index + 1}</span>
                    {parties.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeParty(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={party.role}
                      onChange={(e) => updateParty(index, 'role', e.target.value)}
                      className="px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="BUYER">Buyer</option>
                      <option value="SELLER">Seller</option>
                      <option value="PAYER">Payer</option>
                      <option value="PAYEE">Payee</option>
                      <option value="BENEFICIARY">Beneficiary</option>
                      <option value="AGENT">Agent</option>
                      <option value="OTHER">Other</option>
                    </select>

                    <Input
                      placeholder="Name"
                      value={party.name}
                      onChange={(e) => updateParty(index, 'name', e.target.value)}
                    />

                    <Input
                      type="email"
                      placeholder="Email"
                      value={party.contactEmail}
                      onChange={(e) => updateParty(index, 'contactEmail', e.target.value)}
                    />

                    <Input
                      placeholder="Phone (optional)"
                      value={party.contactPhone}
                      onChange={(e) => updateParty(index, 'contactPhone', e.target.value)}
                    />
                  </div>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={party.isOrganization}
                      onChange={(e) => updateParty(index, 'isOrganization', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">This is an organization</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
