'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  Building2,
  Phone,
  Mail,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface CompanySettings {
  id: string;
  officeAddress: string;
  officeAddressLine2?: string;
  city: string;
  country: string;
  postalCode?: string;
  officePhone?: string;
  officeEmail?: string;
  officeHours?: string;
  authorizedReceivers: string[];
}

export default function AdminSettingsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [newReceiverName, setNewReceiverName] = useState('');
  const [addingReceiver, setAddingReceiver] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    officeAddress: '',
    officeAddressLine2: '',
    city: '',
    country: '',
    postalCode: '',
    officePhone: '',
    officeEmail: '',
    officeHours: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/settings/company`
      );
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setFormData({
          officeAddress: data.officeAddress || '',
          officeAddressLine2: data.officeAddressLine2 || '',
          city: data.city || '',
          country: data.country || '',
          postalCode: data.postalCode || '',
          officePhone: data.officePhone || '',
          officeEmail: data.officeEmail || '',
          officeHours: data.officeHours || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/settings/company`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setSettings(updated);
        toast({
          title: 'Success',
          description: 'Settings saved successfully',
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddReceiver = async () => {
    if (!newReceiverName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name',
        variant: 'destructive',
      });
      return;
    }

    setAddingReceiver(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/settings/company/authorized-receivers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: newReceiverName.trim() }),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setSettings(updated);
        setNewReceiverName('');
        toast({
          title: 'Success',
          description: `${newReceiverName} added as authorized receiver`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add receiver');
      }
    } catch (error: any) {
      console.error('Failed to add receiver:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add receiver',
        variant: 'destructive',
      });
    } finally {
      setAddingReceiver(false);
    }
  };

  const handleRemoveReceiver = async (name: string) => {
    if (!confirm(`Remove ${name} as authorized receiver?`)) {
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/settings/company/authorized-receivers/${encodeURIComponent(name)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setSettings(updated);
        toast({
          title: 'Success',
          description: `${name} removed from authorized receivers`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove receiver');
      }
    } catch (error: any) {
      console.error('Failed to remove receiver:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove receiver',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          Company Settings
        </h1>
        <p className="text-slate-600 mt-2">
          Manage office address and authorized document receivers for Tier 2 Document Custody
        </p>
      </div>

      <div className="space-y-6">
        {/* Office Address Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">Document Delivery Address</h2>
          </div>

          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-900">
              This address will be shown to parties who need to deliver physical documents for
              Tier 2 Document Custody service.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="officeAddress">Address Line 1 *</Label>
              <Input
                id="officeAddress"
                placeholder="45 Narges 3, New Cairo"
                value={formData.officeAddress}
                onChange={(e) =>
                  setFormData({ ...formData, officeAddress: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="officeAddressLine2">Address Line 2 (Optional)</Label>
              <Input
                id="officeAddressLine2"
                placeholder="Building, Floor, Suite"
                value={formData.officeAddressLine2}
                onChange={(e) =>
                  setFormData({ ...formData, officeAddressLine2: e.target.value })
                }
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Cairo"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  placeholder="Egypt"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="11835"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Office Contact Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Phone className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-semibold text-slate-900">Office Contact</h2>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="officePhone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Office Phone
                </Label>
                <Input
                  id="officePhone"
                  type="tel"
                  placeholder="+20 2 2755 4321"
                  value={formData.officePhone}
                  onChange={(e) => setFormData({ ...formData, officePhone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="officeEmail" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Office Email
                </Label>
                <Input
                  id="officeEmail"
                  type="email"
                  placeholder="custody@dealguard.com"
                  value={formData.officeEmail}
                  onChange={(e) => setFormData({ ...formData, officeEmail: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="officeHours" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Office Hours
              </Label>
              <Input
                id="officeHours"
                placeholder="Sunday-Thursday, 9 AM - 5 PM"
                value={formData.officeHours}
                onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Save Button for Address/Contact */}
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Authorized Receivers Section */}
        <Card className="p-6 border-2 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-6 h-6 text-amber-700" />
            <h2 className="text-xl font-semibold text-amber-900">Authorized Document Receivers</h2>
          </div>

          <Alert className="mb-6 bg-amber-100 border-amber-300">
            <AlertTriangle className="h-5 w-5 text-amber-700" />
            <AlertDescription className="text-amber-900">
              <strong>CRITICAL:</strong> Only people in this list are authorized to receive
              physical documents on behalf of DealGuard. Documents delivered to anyone else will
              be <strong>REFUSED</strong>.
            </AlertDescription>
          </Alert>

          {/* Current Authorized Receivers */}
          {settings && settings.authorizedReceivers.length > 0 ? (
            <div className="space-y-3 mb-6">
              {settings.authorizedReceivers.map((name, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white p-4 rounded-lg border border-amber-200"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-slate-900">{name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveReceiver(name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Alert className="mb-6 bg-white border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Warning:</strong> No authorized receivers configured. Documents cannot be
                received until at least one person is added.
              </AlertDescription>
            </Alert>
          )}

          {/* Add New Receiver */}
          <div className="bg-white p-4 rounded-lg border-2 border-dashed border-amber-300">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-700" />
              Add Authorized Receiver
            </h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter full name (e.g., Ahmed Mohamed Hassan)"
                  value={newReceiverName}
                  onChange={(e) => setNewReceiverName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddReceiver();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleAddReceiver}
                disabled={addingReceiver || !newReceiverName.trim()}
              >
                {addingReceiver ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              This person will be able to receive physical documents at the office. Use their full
              legal name.
            </p>
          </div>
        </Card>

        {/* Important Notes */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">📋 Important Notes</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>
                Changes to office address take effect immediately for all new custody documents
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>
                Authorized receivers can be added/removed at any time, but existing in-transit
                documents will retain their original authorized receiver
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>
                When logging document receipt, the system will verify the receiver is in this list
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>
                If wrong person attempts delivery, you must refuse and select the refusal reason
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
