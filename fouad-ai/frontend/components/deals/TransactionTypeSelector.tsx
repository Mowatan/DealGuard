'use client';

import { DollarSign, GitBranch } from 'lucide-react';
import { Label } from '@/components/ui/label';

export type TransactionType = 'SIMPLE' | 'MILESTONE_BASED';

interface TransactionTypeSelectorProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}

const TRANSACTION_TYPES = [
  {
    value: 'SIMPLE' as TransactionType,
    label: 'Simple Transaction',
    description: 'Single payment, single delivery',
    icon: DollarSign,
    details: [
      'One-time payment',
      'Single delivery or service',
      'Quick setup',
      'Perfect for straightforward deals',
    ],
  },
  {
    value: 'MILESTONE_BASED' as TransactionType,
    label: 'Milestone-Based Transaction',
    description: 'Staged payments and deliveries with custom triggers',
    icon: GitBranch,
    details: [
      'Multiple payment stages',
      'Performance-based deliveries',
      'Time-based or condition-based triggers',
      'Flexible for complex deals',
    ],
  },
];

export default function TransactionTypeSelector({
  value,
  onChange,
}: TransactionTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Choose Transaction Type
        </h2>
        <p className="text-slate-600">
          Select how payments and deliveries will be structured
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TRANSACTION_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = value === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
              className={`
                relative p-6 border-2 rounded-xl text-left transition-all
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-lg transform scale-[1.02]'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-md'
                }
              `}
            >
              {/* Selection indicator */}
              <div
                className={`
                absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-slate-300 bg-white'
                }
              `}
              >
                {isSelected && (
                  <div className="w-3 h-3 bg-white rounded-full" />
                )}
              </div>

              {/* Icon */}
              <div
                className={`
                w-16 h-16 rounded-xl flex items-center justify-center mb-4
                ${
                  isSelected
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }
              `}
              >
                <Icon className="w-8 h-8" />
              </div>

              {/* Content */}
              <div className="pr-8">
                <h3
                  className={`
                  text-xl font-bold mb-2
                  ${isSelected ? 'text-blue-900' : 'text-slate-900'}
                `}
                >
                  {type.label}
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  {type.description}
                </p>

                {/* Features list */}
                <ul className="space-y-2">
                  {type.details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span
                        className={`mt-1 ${
                          isSelected ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      >
                        ✓
                      </span>
                      <span className="text-slate-700">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
        <strong className="text-slate-900">💡 Tip:</strong>
        <p className="text-slate-700 mt-1">
          {value === 'SIMPLE'
            ? 'Simple transactions are best for standard buy/sell agreements with a single exchange.'
            : 'Milestone-based transactions allow you to structure complex deals with staged payments, performance-based triggers, and flexible delivery schedules.'}
        </p>
      </div>
    </div>
  );
}
