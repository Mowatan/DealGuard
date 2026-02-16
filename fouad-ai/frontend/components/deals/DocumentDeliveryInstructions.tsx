'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, AlertTriangle, Phone, MapPin, Clock, User } from 'lucide-react';

interface CompanySettings {
  officeAddress: string;
  officeAddressLine2?: string;
  city: string;
  country: string;
  officePhone?: string;
  officeHours?: string;
  authorizedReceivers: string[];
}

interface DocumentDeliveryInstructionsProps {
  dealNumber: string;
  authorizedReceiverName: string;
  onContinue: (trackingNumber?: string, expectedDelivery?: string) => void;
}

export default function DocumentDeliveryInstructions({
  dealNumber,
  authorizedReceiverName,
  onContinue,
}: DocumentDeliveryInstructionsProps) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'hand' | 'courier' | 'mail'>('hand');

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/company`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    onContinue(
      deliveryMethod !== 'hand' ? trackingNumber : undefined,
      deliveryMethod !== 'hand' ? expectedDelivery : undefined
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading delivery instructions...</div>;
  }

  if (!settings) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load delivery instructions. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-2 border-blue-200 bg-blue-50 p-6">
        <div className="flex items-start gap-4">
          <Package className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              📦 Document Delivery Instructions
            </h2>
            <p className="text-sm text-slate-600">
              Deal Reference: <span className="font-mono font-semibold">{dealNumber}</span>
            </p>
          </div>
        </div>
      </Card>

      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <AlertDescription className="text-amber-900">
          <strong>IMPORTANT:</strong> Physical documents must be delivered to our office.
          Documents delivered incorrectly will be refused.
        </AlertDescription>
      </Alert>

      {/* Delivery Address */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-slate-600" />
          DELIVERY ADDRESS
        </h3>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="font-semibold text-slate-900 mb-1">DealGuard Document Custody</div>
          <div className="text-slate-700">{settings.officeAddress}</div>
          {settings.officeAddressLine2 && (
            <div className="text-slate-700">{settings.officeAddressLine2}</div>
          )}
          <div className="text-slate-700">
            {settings.city}, {settings.country}
          </div>
        </div>
      </Card>

      {/* Critical - Authorized Receiver */}
      <Card className="p-6 border-2 border-red-200 bg-red-50">
        <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2">
          <User className="w-5 h-5" />
          ⚠️ CRITICAL - AUTHORIZED RECEIVER
        </h3>
        <Alert className="mb-4 border-red-300 bg-white">
          <AlertDescription className="text-red-900">
            Documents <strong>MUST</strong> be handed to:{' '}
            <span className="font-bold text-lg">{authorizedReceiverName}</span>
          </AlertDescription>
        </Alert>
        <p className="text-sm text-red-800">
          If this person is not present, <strong>DO NOT</strong> leave documents with anyone else.
          Your delivery will be <strong>REFUSED</strong> and you will need to return.
        </p>
      </Card>

      {/* Office Hours & Contact */}
      <Card className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              OFFICE HOURS
            </h3>
            <p className="text-slate-700">{settings.officeHours}</p>
          </div>
          {settings.officePhone && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Phone className="w-5 h-5 text-slate-600" />
                CONTACT
              </h3>
              <p className="text-slate-700">{settings.officePhone}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Required for Delivery */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          📋 PLEASE BRING WITH YOU
        </h3>
        <ul className="space-y-2 text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold mt-0.5">•</span>
            Your national ID or passport
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold mt-0.5">•</span>
            Original documents (no copies)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold mt-0.5">•</span>
            Deal reference number: <span className="font-mono font-semibold">{dealNumber}</span>
          </li>
        </ul>
      </Card>

      {/* Delivery Options */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">DELIVERY OPTIONS</h3>

        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition">
            <input
              type="radio"
              name="deliveryMethod"
              value="hand"
              checked={deliveryMethod === 'hand'}
              onChange={(e) => setDeliveryMethod(e.target.value as any)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-semibold text-slate-900">Hand Delivery (Recommended)</div>
              <div className="text-sm text-slate-600 mt-1">
                Visit our office during business hours and ask for {authorizedReceiverName}
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition">
            <input
              type="radio"
              name="deliveryMethod"
              value="courier"
              checked={deliveryMethod === 'courier'}
              onChange={(e) => setDeliveryMethod(e.target.value as any)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-semibold text-slate-900">Courier Service</div>
              <div className="text-sm text-slate-600 mt-1">
                Use Aramex, DHL, or FedEx with "Signature Required"
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition">
            <input
              type="radio"
              name="deliveryMethod"
              value="mail"
              checked={deliveryMethod === 'mail'}
              onChange={(e) => setDeliveryMethod(e.target.value as any)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-semibold text-slate-900">Registered Mail</div>
              <div className="text-sm text-slate-600 mt-1">
                Slowest option, not recommended for time-sensitive documents
              </div>
            </div>
          </label>
        </div>

        {(deliveryMethod === 'courier' || deliveryMethod === 'mail') && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
            <p className="text-sm text-amber-900 font-medium">
              After shipping, please provide tracking information:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  id="trackingNumber"
                  placeholder="Enter tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="expectedDelivery">Expected Delivery Date</Label>
                <Input
                  id="expectedDelivery"
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Important Notice */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <AlertDescription className="text-red-900">
          <strong>IMPORTANT:</strong> Delivery will be <strong>REFUSED</strong> if received by
          unauthorized person or in poor condition. You will be notified to redeliver.
        </AlertDescription>
      </Alert>

      {/* Action Button */}
      <div className="flex justify-end gap-3 pt-4">
        <Button size="lg" onClick={handleContinue}>
          I Understand - Continue
        </Button>
      </div>
    </div>
  );
}
