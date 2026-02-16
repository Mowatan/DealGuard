'use client';

import { Banknote, Package } from 'lucide-react';
import { Label } from '@/components/ui/label';

export type MilestoneType = 'PAYMENT' | 'PERFORMANCE';

interface MilestoneTypeSelectorProps {
  value: MilestoneType;
  onChange: (type: MilestoneType) => void;
  error?: string;
}

const MILESTONE_TYPES = [
  {
    value: 'PAYMENT' as MilestoneType,
    label: 'Payment Milestone',
    description: 'Money moves from one party to another',
    icon: Banknote,
    examples: 'Down payment, installment, final payment, earnest money',
  },
  {
    value: 'PERFORMANCE' as MilestoneType,
    label: 'Performance Milestone',
    description: 'Goods, services, or assets are transferred',
    icon: Package,
    examples: 'Share transfer, property deed, service delivery, inspection completion',
  },
];

export default function MilestoneTypeSelector({
  value,
  onChange,
  error,
}: MilestoneTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold text-slate-900">
        Milestone Type *
      </Label>
      <p className="text-sm text-slate-600 -mt-2">
        Choose what happens in this milestone
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MILESTONE_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = value === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
              className={`
                relative p-4 border-2 rounded-lg text-left transition-all
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }
              `}
            >
              {/* Selection indicator */}
              <div
                className={`
                absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-slate-300 bg-white'
                }
              `}
              >
                {isSelected && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>

              {/* Icon */}
              <div
                className={`
                w-12 h-12 rounded-lg flex items-center justify-center mb-3
                ${
                  isSelected
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }
              `}
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Content */}
              <div className="pr-6">
                <h4
                  className={`
                  font-semibold mb-1
                  ${isSelected ? 'text-blue-900' : 'text-slate-900'}
                `}
                >
                  {type.label}
                </h4>
                <p className="text-sm text-slate-600 mb-2">
                  {type.description}
                </p>
                <p className="text-xs text-slate-500 italic">
                  e.g., {type.examples}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
