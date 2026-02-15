'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { dealsApi } from '@/lib/api-client';
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, User } from 'lucide-react';
import Link from 'next/link';
import ServiceTierSelector, { ServiceTier } from '@/components/deals/ServiceTierSelector';
import ServiceFeeDisplay from '@/components/deals/ServiceFeeDisplay';

interface Party {
  role: string;
  customRole?: string;
  name: string;
  isOrganization: boolean;
  organizationId?: string;
  contactEmail: string;
  contactPhone?: string;
}

const PREDEFINED_ROLES = [
  { value: 'BUYER', label: 'Buyer', description: 'I am purchasing the asset/property' },
  { value: 'SELLER', label: 'Seller', description: 'I am selling the asset/property' },
  { value: 'BROKER', label: 'Broker', description: 'I am facilitating this transaction' },
  { value: 'OTHER', label: 'Other', description: 'Custom role' },
];

const PARTY_ROLES = [
  { value: 'BUYER', label: 'Buyer' },
  { value: 'SELLER', label: 'Seller' },
  { value: 'BROKER', label: 'Broker' },
  { value: 'AGENT', label: 'Agent' },
  { value: 'BENEFICIARY', label: 'Beneficiary' },
  { value: 'LAWYER', label: 'Lawyer' },
  { value: 'OTHER', label: 'Other' },
];

const CURRENCIES = [
  { value: 'EGP', label: 'EGP - Egyptian Pound', symbol: 'EGP' },
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
  { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
  { value: 'AED', label: 'AED - UAE Dirham', symbol: 'AED' },
  { value: 'SAR', label: 'SAR - Saudi Riyal', symbol: 'SAR' },
];

export default function NewDealPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Service Tier Selection
  const [serviceTier, setServiceTier] = useState<ServiceTier>('GOVERNANCE_ADVISORY');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [calculatedFee, setCalculatedFee] = useState(0);

  // Step 2: Your role
  const [yourRole, setYourRole] = useState('');
  const [yourCustomRole, setYourCustomRole] = useState('');

  // Step 3: Deal details
  const [dealTitle, setDealTitle] = useState('');
  const [dealDescription, setDealDescription] = useState('');
  const [transactionType, setTransactionType] = useState<'SIMPLE' | 'MILESTONE_BASED'>('SIMPLE');
  const [currency, setCurrency] = useState('EGP');
  const [totalAmount, setTotalAmount] = useState('');

  // Step 3: Counterparty
  const [counterparty, setCounterparty] = useState<Party>({
    role: 'BUYER',
    name: '',
    isOrganization: false,
    contactEmail: '',
    contactPhone: '',
  });

  // Step 4: Additional parties
  const [additionalParties, setAdditionalParties] = useState<Party[]>([]);

  // Milestones (for MILESTONE_BASED deals)
  const [milestones, setMilestones] = useState<Array<{
    name: string;
    description: string;
    amount: string;
    deadline?: string;
  }>>([
    { name: '', description: '', amount: '' },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fee calculation function (matches backend logic)
  const calculateFee = (tier: ServiceTier, value: string, curr: string): number => {
    if (tier === 'GOVERNANCE_ADVISORY') {
      return 5000; // Min fee
    }

    const numValue = parseFloat(value);
    if (!numValue || numValue <= 0) return 0;

    // Currency conversion rates (matches backend)
    const rates: Record<string, number> = {
      EGP: 1,
      USD: 49.5,
      EUR: 53.2,
      GBP: 62.1,
      AED: 13.5,
      SAR: 13.2,
    };

    const egpValue = numValue * (rates[curr] || 1);

    if (tier === 'DOCUMENT_CUSTODY') {
      const percentageFee = egpValue * 0.0075; // 0.75%
      const storageFee = 2000;
      return Math.round((percentageFee + storageFee) * 100) / 100;
    }

    if (tier === 'FINANCIAL_ESCROW') {
      let percentage = 0.03; // 3%
      if (egpValue >= 10000000) percentage = 0.015; // 1.5% for 10M+
      else if (egpValue >= 5000000) percentage = 0.02; // 2% for 5M-10M

      const fee = egpValue * percentage;
      return Math.round(Math.max(fee, 25000) * 100) / 100;
    }

    return 0;
  };

  // Recalculate fee when tier, value, or currency changes
  useEffect(() => {
    const fee = calculateFee(serviceTier, estimatedValue, currency);
    setCalculatedFee(fee);
  }, [serviceTier, estimatedValue, currency]);

  // Check authentication
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="container mx-auto">
          <p className="text-center text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Step 1: Service Tier validation
  const validateStep1 = (): boolean => {
    if (!serviceTier) {
      setErrors({ serviceTier: 'Please select a service tier' });
      return false;
    }
    // Tiers 2 & 3 require estimated value
    if (
      (serviceTier === 'DOCUMENT_CUSTODY' || serviceTier === 'FINANCIAL_ESCROW') &&
      (!estimatedValue || parseFloat(estimatedValue) <= 0)
    ) {
      setErrors({ estimatedValue: 'Please enter the estimated deal value' });
      return false;
    }
    setErrors({});
    return true;
  };

  // Step 2: Your role validation
  const validateStep2 = (): boolean => {
    if (!yourRole) {
      setErrors({ role: 'Please select your role' });
      return false;
    }
    if (yourRole === 'OTHER' && !yourCustomRole.trim()) {
      setErrors({ customRole: 'Please describe your role' });
      return false;
    }
    setErrors({});
    return true;
  };

  // Step 3: Deal details validation
  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!dealTitle.trim()) {
      newErrors.title = 'Deal title is required';
    } else if (dealTitle.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    // Validate amount for SIMPLE transactions
    if (transactionType === 'SIMPLE') {
      if (!totalAmount || parseFloat(totalAmount) <= 0) {
        newErrors.totalAmount = 'Please enter a valid transaction amount';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 4: Counterparty validation
  const validateStep4 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!counterparty.name.trim()) {
      newErrors.counterpartyName = 'Name is required';
    }
    if (!counterparty.contactEmail.trim()) {
      newErrors.counterpartyEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(counterparty.contactEmail)) {
      newErrors.counterpartyEmail = 'Invalid email address';
    }
    if (counterparty.role === 'OTHER' && !counterparty.customRole?.trim()) {
      newErrors.counterpartyRole = 'Please specify their role';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 5: Additional parties validation
  const validateStep5 = (): boolean => {
    // Optional step, always valid
    // But validate any parties that have been started
    for (let i = 0; i < additionalParties.length; i++) {
      const party = additionalParties[i];
      if (!party.name.trim() || !party.contactEmail.trim()) {
        toast({
          title: 'Error',
          description: `Additional party ${i + 1} is incomplete. Please fill in name and email or remove it.`,
          variant: 'destructive',
        });
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(party.contactEmail)) {
        toast({
          title: 'Error',
          description: `Invalid email for additional party ${i + 1}`,
          variant: 'destructive',
        });
        return false;
      }
      if (party.role === 'OTHER' && !party.customRole?.trim()) {
        toast({
          title: 'Error',
          description: `Please specify role for additional party ${i + 1}`,
          variant: 'destructive',
        });
        return false;
      }
    }
    return true;
  };

  // Step 6: Milestones validation (for MILESTONE_BASED only)
  const validateStep6 = (): boolean => {
    // Validate milestones for MILESTONE_BASED transactions
    if (milestones.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one milestone',
        variant: 'destructive',
      });
      return false;
    }

    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i];
      if (!milestone.name.trim()) {
        toast({
          title: 'Error',
          description: `Please enter a name for milestone ${i + 1}`,
          variant: 'destructive',
        });
        return false;
      }
      if (!milestone.description.trim()) {
        toast({
          title: 'Error',
          description: `Please enter a description for milestone ${i + 1}`,
          variant: 'destructive',
        });
        return false;
      }
      if (!milestone.amount || parseFloat(milestone.amount) <= 0) {
        toast({
          title: 'Error',
          description: `Please enter a valid amount for milestone ${i + 1}`,
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    let isValid = false;
    switch (currentStep) {
      case 1:
        isValid = validateStep1(); // Service Tier
        break;
      case 2:
        isValid = validateStep2(); // Your Role
        break;
      case 3:
        isValid = validateStep3(); // Deal Details
        break;
      case 4:
        isValid = validateStep4(); // Counterparty
        break;
      case 5:
        isValid = validateStep5(); // Additional Parties
        break;
      case 6:
        // Only validate milestones if it's a MILESTONE_BASED transaction
        if (transactionType === 'MILESTONE_BASED') {
          isValid = validateStep6();
        } else {
          isValid = true;
        }
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  const addAdditionalParty = () => {
    setAdditionalParties([
      ...additionalParties,
      {
        role: 'AGENT',
        name: '',
        isOrganization: false,
        contactEmail: '',
        contactPhone: '',
      },
    ]);
  };

  const removeAdditionalParty = (index: number) => {
    setAdditionalParties(additionalParties.filter((_, i) => i !== index));
  };

  const updateAdditionalParty = (index: number, field: keyof Party, value: any) => {
    const updated = [...additionalParties];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalParties(updated);
  };

  const handleSubmit = async () => {
    if (!validateStep4()) return;

    setLoading(true);

    try {
      const token = await getToken();

      // Get user info
      const userName = user?.fullName || user?.firstName || 'User';
      const userEmail = user?.emailAddresses[0]?.emailAddress || '';

      // Determine the final role for current user
      const myFinalRole = yourRole === 'OTHER' ? yourCustomRole.trim() : yourRole;

      // Build parties array
      const parties: Party[] = [
        // Current user
        {
          role: myFinalRole,
          name: userName,
          isOrganization: false,
          contactEmail: userEmail,
        },
        // Counterparty
        {
          ...counterparty,
          role: counterparty.role === 'OTHER' ? counterparty.customRole!.trim() : counterparty.role,
        },
        // Additional parties
        ...additionalParties.map(p => ({
          ...p,
          role: p.role === 'OTHER' ? p.customRole!.trim() : p.role,
        })),
      ];

      const payload: any = {
        title: dealTitle.trim(),
        description: dealDescription.trim() || undefined,

        // Service tier and fees
        serviceTier,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,

        // Transaction details
        transactionType,
        currency,

        parties,
        creatorName: userName,
        creatorEmail: userEmail,
      };

      // Add totalAmount for SIMPLE transactions
      if (transactionType === 'SIMPLE' && totalAmount) {
        payload.totalAmount = parseFloat(totalAmount);
      }

      // Add milestones if MILESTONE_BASED
      if (transactionType === 'MILESTONE_BASED' && milestones.length > 0) {
        payload.milestones = milestones.map(m => ({
          name: m.name.trim(),
          description: m.description.trim(),
          amount: m.amount,
          deadline: m.deadline || undefined,
        }));
      }

      const result = await dealsApi.create(payload, token);

      toast({
        title: 'Success',
        description: 'Deal created and invitations sent!',
      });

      // Redirect to the deal page
      router.push(`/admin/deals/${result.id}`);
    } catch (error: any) {
      console.error('Error creating deal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create deal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFinalRole = (role: string, customRole?: string) => {
    return role === 'OTHER' ? customRole : role;
  };

  const totalParties = 2 + additionalParties.length; // You + counterparty + additional

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/deals"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to deals
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Create New Deal</h1>
          <p className="mt-2 text-slate-600">
            Set up a new transaction with secure escrow management
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: transactionType === 'MILESTONE_BASED' ? 7 : 6 }).map((_, idx) => {
              const step = idx + 1;
              const totalSteps = transactionType === 'MILESTONE_BASED' ? 7 : 6;
              return (
                <div
                  key={step}
                  className={`flex items-center ${step < totalSteps ? 'flex-1' : ''}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      step < currentStep
                        ? 'bg-green-500 text-white'
                        : step === currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-300 text-slate-600'
                    }`}
                  >
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                  {step < totalSteps && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        step < currentStep ? 'bg-green-500' : 'bg-slate-300'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Service</span>
            <span>Your Role</span>
            <span>Details</span>
            <span>Party</span>
            <span>Additional</span>
            {transactionType === 'MILESTONE_BASED' && <span>Milestones</span>}
            <span>Review</span>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Step 1: Service Tier Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <ServiceTierSelector
                value={serviceTier}
                onChange={(tier) => {
                  setServiceTier(tier);
                  // Clear estimated value if switching to Tier 1
                  if (tier === 'GOVERNANCE_ADVISORY') {
                    setEstimatedValue('');
                  }
                }}
                error={errors.serviceTier}
              />

              {/* Estimated Value Input (for Tier 2 & 3) */}
              {(serviceTier === 'DOCUMENT_CUSTODY' || serviceTier === 'FINANCIAL_ESCROW') && (
                <div>
                  <Label htmlFor="estimatedValue">Estimated Deal Value *</Label>
                  <div className="flex gap-3 mt-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {CURRENCIES.map((curr) => (
                        <option key={curr.value} value={curr.value}>
                          {curr.symbol}
                        </option>
                      ))}
                    </select>
                    <Input
                      id="estimatedValue"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={estimatedValue}
                      onChange={(e) => setEstimatedValue(e.target.value)}
                      className={`flex-1 ${errors.estimatedValue ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.estimatedValue && (
                    <p className="text-red-500 text-sm mt-1">{errors.estimatedValue}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Provide your best estimate of the total transaction value
                  </p>
                </div>
              )}

              {/* Fee Display */}
              {calculatedFee > 0 && (
                <ServiceFeeDisplay
                  serviceTier={serviceTier}
                  estimatedValue={estimatedValue ? parseFloat(estimatedValue) : undefined}
                  currency={currency}
                  calculatedFee={calculatedFee}
                />
              )}
            </div>
          )}

          {/* Step 2: Your Role */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  What is your role in this transaction?
                </h2>
                <p className="text-slate-600">
                  This helps us understand your relationship to the deal
                </p>
              </div>

              <div className="space-y-3">
                {PREDEFINED_ROLES.map((role) => (
                  <div key={role.value}>
                    <label
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition ${
                        yourRole === role.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="yourRole"
                        value={role.value}
                        checked={yourRole === role.value}
                        onChange={(e) => setYourRole(e.target.value)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">
                          {role.label}
                        </div>
                        <div className="text-sm text-slate-600">
                          {role.description}
                        </div>
                      </div>
                    </label>

                    {yourRole === 'OTHER' && role.value === 'OTHER' && (
                      <div className="mt-3 ml-8">
                        <Input
                          placeholder="e.g., Legal Representative, Escrow Agent, Trustee"
                          value={yourCustomRole}
                          onChange={(e) => setYourCustomRole(e.target.value)}
                          maxLength={50}
                          className={errors.customRole ? 'border-red-500' : ''}
                        />
                        {errors.customRole && (
                          <p className="text-red-500 text-sm mt-1">{errors.customRole}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {errors.role && (
                <p className="text-red-500 text-sm">{errors.role}</p>
              )}
            </div>
          )}

          {/* Step 3: Deal Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Deal Details
                </h2>
                <p className="text-slate-600">
                  Provide basic information about this transaction
                </p>
              </div>

              <div>
                <Label>Your Role</Label>
                <div className="mt-1 p-3 bg-slate-100 rounded-lg text-slate-900 font-medium">
                  {getFinalRole(yourRole, yourCustomRole)}
                </div>
              </div>

              <div>
                <Label htmlFor="title">Deal Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Commercial Property Purchase - 123 Main St"
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Deal Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Provide a brief description of the transaction..."
                  value={dealDescription}
                  onChange={(e) => setDealDescription(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-slate-500 mt-1">
                  This will be visible to all parties in the deal
                </p>
              </div>

              <div>
                <Label>Transaction Type *</Label>
                <div className="mt-2 space-y-3">
                  <label
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      transactionType === 'SIMPLE'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transactionType"
                      value="SIMPLE"
                      checked={transactionType === 'SIMPLE'}
                      onChange={(e) => setTransactionType(e.target.value as 'SIMPLE' | 'MILESTONE_BASED')}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">Simple Transaction</div>
                      <div className="text-sm text-slate-600 mt-1">
                        Single payment, single delivery. Best for straightforward deals.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      transactionType === 'MILESTONE_BASED'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transactionType"
                      value="MILESTONE_BASED"
                      checked={transactionType === 'MILESTONE_BASED'}
                      onChange={(e) => setTransactionType(e.target.value as 'SIMPLE' | 'MILESTONE_BASED')}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">Milestone-Based Transaction</div>
                      <div className="text-sm text-slate-600 mt-1">
                        Multiple staged payments and deliveries. Ideal for complex deals with multiple phases.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency">Currency *</Label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr.value} value={curr.value}>
                        {curr.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    All amounts in this deal will be in this currency
                  </p>
                </div>

                {transactionType === 'SIMPLE' && (
                  <div>
                    <Label htmlFor="totalAmount">Total Transaction Amount *</Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      className={errors.totalAmount ? 'border-red-500' : ''}
                    />
                    {errors.totalAmount && (
                      <p className="text-red-500 text-sm mt-1">{errors.totalAmount}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Counterparty */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Invite Counterparty
                </h2>
                <p className="text-slate-600">
                  Who is the other main party in this transaction?
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="counterpartyName">Their Name *</Label>
                  <Input
                    id="counterpartyName"
                    placeholder="John Doe"
                    value={counterparty.name}
                    onChange={(e) =>
                      setCounterparty({ ...counterparty, name: e.target.value })
                    }
                    className={errors.counterpartyName ? 'border-red-500' : ''}
                  />
                  {errors.counterpartyName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.counterpartyName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="counterpartyEmail">Their Email *</Label>
                  <Input
                    id="counterpartyEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={counterparty.contactEmail}
                    onChange={(e) =>
                      setCounterparty({
                        ...counterparty,
                        contactEmail: e.target.value,
                      })
                    }
                    className={errors.counterpartyEmail ? 'border-red-500' : ''}
                  />
                  {errors.counterpartyEmail && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.counterpartyEmail}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="counterpartyRole">Their Role *</Label>
                <select
                  id="counterpartyRole"
                  value={counterparty.role}
                  onChange={(e) =>
                    setCounterparty({ ...counterparty, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PARTY_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>

                {counterparty.role === 'OTHER' && (
                  <div className="mt-3">
                    <Input
                      placeholder="Specify their role"
                      value={counterparty.customRole || ''}
                      onChange={(e) =>
                        setCounterparty({
                          ...counterparty,
                          customRole: e.target.value,
                        })
                      }
                      className={errors.counterpartyRole ? 'border-red-500' : ''}
                    />
                    {errors.counterpartyRole && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.counterpartyRole}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="counterpartyPhone">Their Phone (Optional)</Label>
                <Input
                  id="counterpartyPhone"
                  placeholder="+1 234 567 8900"
                  value={counterparty.contactPhone || ''}
                  onChange={(e) =>
                    setCounterparty({
                      ...counterparty,
                      contactPhone: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="counterpartyIsOrg"
                  checked={counterparty.isOrganization}
                  onChange={(e) =>
                    setCounterparty({
                      ...counterparty,
                      isOrganization: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <Label htmlFor="counterpartyIsOrg" className="cursor-pointer">
                  This is an organization
                </Label>
              </div>
            </div>
          )}

          {/* Step 5: Additional Parties */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Additional Parties (Optional)
                </h2>
                <p className="text-slate-600">
                  Add more parties like lawyers, agents, or beneficiaries
                </p>
              </div>

              {additionalParties.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
                  <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 mb-4">No additional parties yet</p>
                  <Button onClick={addAdditionalParty} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Party
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {additionalParties.map((party, index) => (
                    <div
                      key={index}
                      className="border border-slate-200 rounded-lg p-4 relative"
                    >
                      <button
                        type="button"
                        onClick={() => removeAdditionalParty(index)}
                        className="absolute top-4 right-4 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <h4 className="font-semibold text-slate-900 mb-3">
                        Additional Party {index + 1}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Name *</Label>
                          <Input
                            placeholder="Name"
                            value={party.name}
                            onChange={(e) =>
                              updateAdditionalParty(index, 'name', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            placeholder="email@example.com"
                            value={party.contactEmail}
                            onChange={(e) =>
                              updateAdditionalParty(
                                index,
                                'contactEmail',
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <Label>Role *</Label>
                          <select
                            value={party.role}
                            onChange={(e) =>
                              updateAdditionalParty(index, 'role', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {PARTY_ROLES.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>

                          {party.role === 'OTHER' && (
                            <Input
                              placeholder="Specify role"
                              value={party.customRole || ''}
                              onChange={(e) =>
                                updateAdditionalParty(
                                  index,
                                  'customRole',
                                  e.target.value
                                )
                              }
                              className="mt-2"
                            />
                          )}
                        </div>

                        <div>
                          <Label>Phone (Optional)</Label>
                          <Input
                            placeholder="+1 234 567 8900"
                            value={party.contactPhone || ''}
                            onChange={(e) =>
                              updateAdditionalParty(
                                index,
                                'contactPhone',
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="flex items-center mt-3">
                        <input
                          type="checkbox"
                          checked={party.isOrganization}
                          onChange={(e) =>
                            updateAdditionalParty(
                              index,
                              'isOrganization',
                              e.target.checked
                            )
                          }
                          className="mr-2"
                        />
                        <Label>This is an organization</Label>
                      </div>
                    </div>
                  ))}

                  <Button
                    onClick={addAdditionalParty}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Party
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Configure Milestones (only for MILESTONE_BASED) */}
          {/* Step 6: Milestones (for MILESTONE_BASED only) */}
          {currentStep === 6 && transactionType === 'MILESTONE_BASED' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Configure Milestones
                </h2>
                <p className="text-slate-600">
                  Define the payment and delivery milestones for this deal
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Break down your deal into clear milestones. Each milestone can have a payment amount, description, and optional deadline.
                </p>
              </div>

              <div className="space-y-4">
                {milestones.map((milestone, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-900">
                        Milestone {index + 1}
                      </h3>
                      {milestones.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newMilestones = milestones.filter((_, i) => i !== index);
                            setMilestones(newMilestones);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor={`milestone-name-${index}`}>Milestone Name *</Label>
                        <Input
                          id={`milestone-name-${index}`}
                          placeholder="e.g., Initial Deposit, Property Inspection Complete"
                          value={milestone.name}
                          onChange={(e) => {
                            const newMilestones = [...milestones];
                            newMilestones[index].name = e.target.value;
                            setMilestones(newMilestones);
                          }}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor={`milestone-desc-${index}`}>Description *</Label>
                        <Textarea
                          id={`milestone-desc-${index}`}
                          placeholder="Describe what needs to be delivered or completed..."
                          value={milestone.description}
                          onChange={(e) => {
                            const newMilestones = [...milestones];
                            newMilestones[index].description = e.target.value;
                            setMilestones(newMilestones);
                          }}
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`milestone-amount-${index}`}>Payment Amount *</Label>
                        <Input
                          id={`milestone-amount-${index}`}
                          type="number"
                          placeholder="0.00"
                          value={milestone.amount}
                          onChange={(e) => {
                            const newMilestones = [...milestones];
                            newMilestones[index].amount = e.target.value;
                            setMilestones(newMilestones);
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`milestone-deadline-${index}`}>Deadline (Optional)</Label>
                        <Input
                          id={`milestone-deadline-${index}`}
                          type="date"
                          value={milestone.deadline || ''}
                          onChange={(e) => {
                            const newMilestones = [...milestones];
                            newMilestones[index].deadline = e.target.value;
                            setMilestones(newMilestones);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={() => {
                    setMilestones([
                      ...milestones,
                      { name: '', description: '', amount: '' },
                    ]);
                  }}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Milestone
                </Button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="text-2xl font-bold text-slate-700 mt-1">
                    Total:
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-bold text-slate-900">
                      {milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0).toLocaleString()} {currency}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} configured
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6 or 7: Review */}
          {currentStep === (transactionType === 'MILESTONE_BASED' ? 7 : 6) && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Review & Create
                </h2>
                <p className="text-slate-600">
                  Review the details before creating the deal
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Deal Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-600">Service Tier:</span>{' '}
                      <span className="font-medium">
                        {serviceTier === 'GOVERNANCE_ADVISORY' && 'Governance & Advisory (Tier 1)'}
                        {serviceTier === 'DOCUMENT_CUSTODY' && 'Document Custody (Tier 2)'}
                        {serviceTier === 'FINANCIAL_ESCROW' && 'Financial Escrow (Tier 3)'}
                      </span>
                    </div>
                    {estimatedValue && parseFloat(estimatedValue) > 0 && (
                      <div>
                        <span className="text-slate-600">Estimated Value:</span>{' '}
                        <span className="font-medium">
                          {parseFloat(estimatedValue).toLocaleString()} {currency}
                        </span>
                      </div>
                    )}
                    {calculatedFee > 0 && (
                      <div>
                        <span className="text-slate-600">Service Fee:</span>{' '}
                        <span className="font-medium text-lg text-blue-700">
                          {calculatedFee.toLocaleString()} EGP
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-600">Title:</span>{' '}
                      <span className="font-medium">{dealTitle}</span>
                    </div>
                    {dealDescription && (
                      <div>
                        <span className="text-slate-600">Description:</span>{' '}
                        <span className="text-slate-800">{dealDescription}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-600">Transaction Type:</span>{' '}
                      <span className="font-medium">
                        {transactionType === 'SIMPLE' ? 'Simple Transaction' : 'Milestone-Based'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">Currency:</span>{' '}
                      <span className="font-medium">{currency}</span>
                    </div>
                    {transactionType === 'SIMPLE' && totalAmount && (
                      <div>
                        <span className="text-slate-600">Total Amount:</span>{' '}
                        <span className="font-medium text-lg">
                          {parseFloat(totalAmount).toLocaleString()} {currency}
                        </span>
                      </div>
                    )}
                    {transactionType === 'MILESTONE_BASED' && (
                      <div>
                        <span className="text-slate-600">Total Amount:</span>{' '}
                        <span className="font-medium text-lg">
                          {milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0).toLocaleString()} {currency}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">
                          ({milestones.length} milestone{milestones.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-semibold text-slate-900 mb-3">
                    Parties ({totalParties})
                  </h3>

                  <div className="space-y-3">
                    {/* Current user */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-slate-900">
                            {user?.fullName || user?.firstName || 'You'}
                          </div>
                          <div className="text-sm text-slate-600">
                            {user?.emailAddresses[0]?.emailAddress}
                          </div>
                          <div className="text-sm text-blue-700 font-medium mt-1">
                            Role: {getFinalRole(yourRole, yourCustomRole)}
                          </div>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          You
                        </span>
                      </div>
                    </div>

                    {/* Counterparty */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="font-medium text-slate-900">
                        {counterparty.name}
                      </div>
                      <div className="text-sm text-slate-600">
                        {counterparty.contactEmail}
                      </div>
                      <div className="text-sm text-slate-700 mt-1">
                        Role: {getFinalRole(counterparty.role, counterparty.customRole)}
                      </div>
                      {counterparty.isOrganization && (
                        <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded mt-1 inline-block">
                          Organization
                        </span>
                      )}
                    </div>

                    {/* Additional parties */}
                    {additionalParties.map((party, index) => (
                      <div
                        key={index}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-3"
                      >
                        <div className="font-medium text-slate-900">
                          {party.name}
                        </div>
                        <div className="text-sm text-slate-600">
                          {party.contactEmail}
                        </div>
                        <div className="text-sm text-slate-700 mt-1">
                          Role: {getFinalRole(party.role, party.customRole)}
                        </div>
                        {party.isOrganization && (
                          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded mt-1 inline-block">
                            Organization
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-2">
                  What happens next?
                </h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Deal will be created in DRAFT status</li>
                  <li>
                    • Invitation emails will be sent to all parties
                  </li>
                  <li>• Invited parties can sign up using the link in their email</li>
                  <li>• You'll be redirected to the deal page to continue setup</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-slate-200">
            {currentStep > 1 && (
              <Button onClick={handleBack} variant="outline" disabled={loading}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}

            {currentStep < (transactionType === 'MILESTONE_BASED' ? 6 : 5) ? (
              <Button onClick={handleNext} className="ml-auto">
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="ml-auto">
                {loading ? 'Creating...' : 'Create Deal & Send Invitations'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
