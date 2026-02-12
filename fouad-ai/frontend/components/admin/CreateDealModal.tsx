'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { dealsApi } from '@/lib/api-client';
import { useToast } from '@/components/ui/Toast';
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

export function CreateDealModal({ isOpen, onClose, onSuccess }: CreateDealModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [parties, setParties] = useState<Party[]>([
    { role: 'BUYER', name: '', isOrganization: false, contactEmail: '', contactPhone: '' },
    { role: 'SELLER', name: '', isOrganization: false, contactEmail: '', contactPhone: '' },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await dealsApi.create({
        ...formData,
        parties: parties.filter(p => p.name && p.contactEmail),
      });

      showToast('success', 'Deal created successfully!');
      onSuccess();
      onClose();

      // Reset form
      setFormData({ title: '', description: '' });
      setParties([
        { role: 'BUYER', name: '', isOrganization: false, contactEmail: '', contactPhone: '' },
        { role: 'SELLER', name: '', isOrganization: false, contactEmail: '', contactPhone: '' },
      ]);
    } catch (error: any) {
      showToast('error', error.message || 'Failed to create deal');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Deal" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Deal Title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Property Sale - Villa in New Cairo"
        />

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the deal..."
        />

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Parties (minimum 2)</label>
            <Button type="button" variant="secondary" size="sm" onClick={addParty}>
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
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Deal
          </Button>
        </div>
      </form>
    </Modal>
  );
}
