'use client';

import { Shield, FileBox, Vault } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type ServiceTier = 'GOVERNANCE_ADVISORY' | 'DOCUMENT_CUSTODY' | 'FINANCIAL_ESCROW';

interface ServiceTierSelectorProps {
  value: ServiceTier;
  onChange: (tier: ServiceTier) => void;
  error?: string;
}

const SERVICE_TIERS = [
  {
    value: 'GOVERNANCE_ADVISORY' as ServiceTier,
    label: 'Governance & Advisory',
    shortLabel: 'Tier 1',
    description: 'Coordination and monitoring without custody',
    icon: Shield,
    features: [
      'Milestone monitoring & tracking',
      'AI evidence verification',
      'Audit trail & blockchain anchoring',
      'Email coordination hub',
    ],
    pricing: '0.5% (min 5,000 EGP)',
    color: 'blue',
    recommended: false,
    useCase: 'Established relationships, low-risk deals',
  },
  {
    value: 'DOCUMENT_CUSTODY' as ServiceTier,
    label: 'Document Custody',
    shortLabel: 'Tier 2',
    description: 'Secure document escrow + all Tier 1 features',
    icon: FileBox,
    features: [
      'All Tier 1 features',
      'Physical vault document storage',
      'Title deed & contract custody',
      'Digital twin + blockchain proof',
    ],
    pricing: '0.75-1% + storage fee',
    color: 'purple',
    recommended: true,
    useCase: 'Real estate, high-value asset transactions',
  },
  {
    value: 'FINANCIAL_ESCROW' as ServiceTier,
    label: 'Financial Escrow',
    shortLabel: 'Tier 3',
    description: 'Full paymaster service + all Tier 1 & 2 features',
    icon: Vault,
    features: [
      'All Tier 1 & 2 features',
      'Financial custody & escrow',
      'Guarantor cheque holding',
      'Multi-signature disbursement',
    ],
    pricing: '1.5-3% (min 25,000 EGP)',
    color: 'green',
    recommended: false,
    useCase: 'Large transactions (5M+), complex financial structures',
  },
];

const colorClasses = {
  blue: {
    selected: 'border-blue-600 bg-blue-50 shadow-lg',
    icon: 'bg-blue-100 text-blue-700',
    text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-700',
    radio: 'border-blue-600 bg-blue-600',
  },
  purple: {
    selected: 'border-purple-600 bg-purple-50 shadow-lg',
    icon: 'bg-purple-100 text-purple-700',
    text: 'text-purple-900',
    badge: 'bg-purple-100 text-purple-700',
    radio: 'border-purple-600 bg-purple-600',
  },
  green: {
    selected: 'border-green-600 bg-green-50 shadow-lg',
    icon: 'bg-green-100 text-green-700',
    text: 'text-green-900',
    badge: 'bg-green-100 text-green-700',
    radio: 'border-green-600 bg-green-600',
  },
};

export default function ServiceTierSelector({
  value,
  onChange,
  error,
}: ServiceTierSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Choose Service Tier
        </h2>
        <p className="text-slate-600">
          Select the level of custody and service management for this deal
        </p>
      </div>

      <div className="space-y-4">
        {SERVICE_TIERS.map((tier) => {
          const Icon = tier.icon;
          const isSelected = value === tier.value;
          const colors = colorClasses[tier.color as keyof typeof colorClasses];

          return (
            <button
              key={tier.value}
              type="button"
              onClick={() => onChange(tier.value)}
              className={`
                relative w-full p-6 border-2 rounded-xl text-left transition-all
                ${
                  isSelected
                    ? colors.selected
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-md'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`
                    w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0
                    ${isSelected ? colors.icon : 'bg-slate-100 text-slate-600'}
                  `}
                >
                  <Icon className="w-7 h-7" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3
                      className={`
                        text-xl font-bold
                        ${isSelected ? colors.text : 'text-slate-900'}
                      `}
                    >
                      {tier.label}
                    </h3>
                    <span
                      className={`
                        text-sm font-semibold px-2 py-0.5 rounded
                        ${isSelected ? colors.badge : 'bg-slate-100 text-slate-600'}
                      `}
                    >
                      {tier.shortLabel}
                    </span>
                  </div>

                  {/* Recommended badge underneath title */}
                  {tier.recommended && (
                    <div className="mb-3">
                      <Badge className="bg-amber-500 text-white">Most Popular</Badge>
                    </div>
                  )}

                  <p className="text-sm text-slate-600 mb-3">
                    {tier.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-1.5 mb-3">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span
                          className={`mt-1 flex-shrink-0 ${
                            isSelected ? colors.text : 'text-slate-400'
                          }`}
                        >
                          ✓
                        </span>
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Pricing & Use Case */}
                  <div className="flex items-center gap-4 text-sm pt-3 border-t border-slate-200">
                    <div>
                      <span className="text-slate-600">Fee: </span>
                      <span className="font-semibold text-slate-900">{tier.pricing}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-300" />
                    <div className="text-slate-600 italic">{tier.useCase}</div>
                  </div>
                </div>

                {/* Radio indicator */}
                <div
                  className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1
                    ${isSelected ? colors.radio : 'border-slate-300 bg-white'}
                  `}
                >
                  {isSelected && (
                    <div className="w-3 h-3 bg-white rounded-full" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {/* Info box */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
        <strong className="text-slate-900">💡 Tip:</strong>
        <p className="text-slate-700 mt-1">
          {value === 'GOVERNANCE_ADVISORY' &&
            'This tier is perfect for deals where parties manage their own custody but want coordination and evidence tracking.'}
          {value === 'DOCUMENT_CUSTODY' &&
            'This tier adds physical document custody, ideal for real estate and asset transfers requiring secure storage of legal documents.'}
          {value === 'FINANCIAL_ESCROW' &&
            'This tier provides full financial custody with multi-signature controls, best for large transactions requiring paymaster services.'}
        </p>
      </div>
    </div>
  );
}
