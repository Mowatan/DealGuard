'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { dealsApi } from '@/lib/api-client';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Party {
  role: string;
  name: string;
  isOrganization: boolean;
  organizationId?: string;
  contactEmail: string;
  contactPhone?: string;
}

const PARTY_ROLES = [
  { value: 'BUYER', label: 'Buyer' },
  { value: 'SELLER', label: 'Seller' },
  { value: 'PAYER', label: 'Payer' },
  { value: 'PAYEE', label: 'Payee' },
  { value: 'BENEFICIARY', label: 'Beneficiary' },
  { value: 'AGENT', label: 'Agent' },
  { value: 'OTHER', label: 'Other' },
];

export default function NewDealPage() {
  const router = useRouter();
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

  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    parties?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate title
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    // Validate parties
    const validParties = parties.filter(p => p.name.trim() && p.contactEmail.trim());
    if (validParties.length < 2) {
      newErrors.parties = 'At least 2 parties with name and email are required';
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const party of parties) {
      if (party.contactEmail && !emailRegex.test(party.contactEmail)) {
        newErrors.parties = 'All email addresses must be valid';
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Filter out empty parties
      const validParties = parties.filter(p => p.name.trim() && p.contactEmail.trim());

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        parties: validParties.map(p => ({
          role: p.role,
          name: p.name.trim(),
          isOrganization: p.isOrganization,
          contactEmail: p.contactEmail.trim(),
          contactPhone: p.contactPhone?.trim() || undefined,
        })),
      };

      const result = await dealsApi.create(payload);

      showToast('success', 'Deal created successfully!');

      // Redirect to the new deal's detail page
      router.push(`/admin/deals/${result.id}`);
    } catch (error: any) {
      console.error('Error creating deal:', error);
      showToast('error', error.message || 'Failed to create deal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addParty = () => {
    setParties([
      ...parties,
      { role: 'OTHER', name: '', isOrganization: false, contactEmail: '', contactPhone: '' },
    ]);
  };

  const removeParty = (index: number) => {
    if (parties.length <= 2) {
      showToast('error', 'You must have at least 2 parties');
      return;
    }
    setParties(parties.filter((_, i) => i !== index));
  };

  const updateParty = (index: number, field: keyof Party, value: any) => {
    const updated = [...parties];
    updated[index] = { ...updated[index], [field]: value };
    setParties(updated);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/deals"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to deals
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create New Deal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Set up a new escrow deal with parties and terms
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Deal Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Deal Information</h2>

            <Input
              label="Deal Title"
              required
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: undefined });
              }}
              error={errors.title}
              placeholder="e.g., Property Sale - Villa in New Cairo"
              helperText="A clear, descriptive title for this escrow deal"
            />

            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the deal, its terms, and any important details..."
              helperText="Optional but recommended for clarity"
              rows={4}
            />
          </div>

          {/* Parties */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Parties</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Add all parties involved in this deal (minimum 2 required)
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={addParty}>
                <Plus className="w-4 h-4 mr-1" />
                Add Party
              </Button>
            </div>

            {errors.parties && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{errors.parties}</p>
              </div>
            )}

            <div className="space-y-4">
              {parties.map((party, index) => (
                <div
                  key={index}
                  className="p-5 border border-gray-200 rounded-lg space-y-4 hover:border-gray-300 transition-colors"
                >
                  {/* Party Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Party {index + 1}
                      {index === 0 && ' (Buyer)'}
                      {index === 1 && ' (Seller)'}
                    </span>
                    {parties.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeParty(index)}
                        className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                        title="Remove party"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Party Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Role */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={party.role}
                        onChange={(e) => updateParty(index, 'role', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        {PARTY_ROLES.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Name */}
                    <Input
                      label="Name"
                      required
                      value={party.name}
                      onChange={(e) => updateParty(index, 'name', e.target.value)}
                      placeholder="Full name or company name"
                    />

                    {/* Email */}
                    <Input
                      label="Contact Email"
                      type="email"
                      required
                      value={party.contactEmail}
                      onChange={(e) => updateParty(index, 'contactEmail', e.target.value)}
                      placeholder="email@example.com"
                    />

                    {/* Phone */}
                    <Input
                      label="Contact Phone (Optional)"
                      value={party.contactPhone || ''}
                      onChange={(e) => updateParty(index, 'contactPhone', e.target.value)}
                      placeholder="+20 123 456 7890"
                    />
                  </div>

                  {/* Organization Checkbox */}
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={party.isOrganization}
                      onChange={(e) => updateParty(index, 'isOrganization', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">This party is an organization/company</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Link href="/admin/deals">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (confirm('Are you sure? All entered data will be lost.')) {
                    router.back();
                  }
                }}
              >
                Discard
              </Button>
              <Button type="submit" loading={loading}>
                Create Deal
              </Button>
            </div>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Make the title clear and descriptive</li>
            <li>• Add all parties that will be involved in the deal</li>
            <li>• Verify email addresses are correct - they'll be used for notifications</li>
            <li>• You can add contract terms and milestones after creating the deal</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
