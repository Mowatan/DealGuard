'use client';

import { Clock, CheckCircle, Target, Zap, GitMerge } from 'lucide-react';
import { Label } from '@/components/ui/label';

export type TriggerType =
  | 'IMMEDIATE'
  | 'TIME_BASED'
  | 'PERFORMANCE_BASED'
  | 'KPI_BASED'
  | 'HYBRID';

interface TriggerSelectorProps {
  value: TriggerType;
  onChange: (type: TriggerType) => void;
  error?: string;
  milestoneNumber?: number;
}

const TRIGGER_TYPES = [
  {
    value: 'IMMEDIATE' as TriggerType,
    label: 'Immediate',
    description: 'Milestone starts right away when the deal begins',
    icon: Zap,
    color: 'green',
  },
  {
    value: 'TIME_BASED' as TriggerType,
    label: 'Time-Based',
    description: 'Triggered after a specific time period or on a date',
    icon: Clock,
    color: 'blue',
  },
  {
    value: 'PERFORMANCE_BASED' as TriggerType,
    label: 'Performance-Based',
    description: 'Triggered when previous milestone completes',
    icon: CheckCircle,
    color: 'purple',
  },
  {
    value: 'KPI_BASED' as TriggerType,
    label: 'KPI-Based',
    description: 'Triggered when custom conditions or metrics are met',
    icon: Target,
    color: 'orange',
  },
  {
    value: 'HYBRID' as TriggerType,
    label: 'Hybrid (Multiple Conditions)',
    description: 'Combination of time, performance, and custom conditions',
    icon: GitMerge,
    color: 'pink',
  },
];

const colorClasses = {
  green: {
    selected: 'border-green-600 bg-green-50',
    icon: 'bg-green-100 text-green-700',
    text: 'text-green-900',
    radio: 'border-green-600 bg-green-600',
  },
  blue: {
    selected: 'border-blue-600 bg-blue-50',
    icon: 'bg-blue-100 text-blue-700',
    text: 'text-blue-900',
    radio: 'border-blue-600 bg-blue-600',
  },
  purple: {
    selected: 'border-purple-600 bg-purple-50',
    icon: 'bg-purple-100 text-purple-700',
    text: 'text-purple-900',
    radio: 'border-purple-600 bg-purple-600',
  },
  orange: {
    selected: 'border-orange-600 bg-orange-50',
    icon: 'bg-orange-100 text-orange-700',
    text: 'text-orange-900',
    radio: 'border-orange-600 bg-orange-600',
  },
  pink: {
    selected: 'border-pink-600 bg-pink-50',
    icon: 'bg-pink-100 text-pink-700',
    text: 'text-pink-900',
    radio: 'border-pink-600 bg-pink-600',
  },
};

export default function TriggerSelector({
  value,
  onChange,
  error,
  milestoneNumber = 1,
}: TriggerSelectorProps) {
  // Disable IMMEDIATE for milestones after the first one
  const isFirstMilestone = milestoneNumber === 1;

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold text-slate-900">
        Completion Trigger *
      </Label>
      <p className="text-sm text-slate-600 -mt-2">
        Choose what activates this milestone
      </p>

      <div className="space-y-3">
        {TRIGGER_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = value === type.value;
          const colors = colorClasses[type.color as keyof typeof colorClasses];
          const isDisabled = type.value === 'IMMEDIATE' && !isFirstMilestone;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => !isDisabled && onChange(type.value)}
              disabled={isDisabled}
              className={`
                relative w-full p-4 border-2 rounded-lg text-left transition-all
                ${
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50'
                    : isSelected
                    ? `${colors.selected} shadow-md`
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`
                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  ${
                    isDisabled
                      ? 'bg-slate-100 text-slate-400'
                      : isSelected
                      ? colors.icon
                      : 'bg-slate-100 text-slate-600'
                  }
                `}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={`
                    font-semibold mb-1
                    ${
                      isDisabled
                        ? 'text-slate-500'
                        : isSelected
                        ? colors.text
                        : 'text-slate-900'
                    }
                  `}
                  >
                    {type.label}
                    {isDisabled && (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        (Only for first milestone)
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-slate-600">{type.description}</p>
                </div>

                {/* Radio indicator */}
                <div
                  className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1
                  ${
                    isDisabled
                      ? 'border-slate-300 bg-slate-100'
                      : isSelected
                      ? colors.radio
                      : 'border-slate-300 bg-white'
                  }
                `}
                >
                  {isSelected && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {!isFirstMilestone && value === 'IMMEDIATE' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <strong>Note:</strong> IMMEDIATE trigger is only available for the
          first milestone. This milestone will use a different trigger.
        </div>
      )}
    </div>
  );
}
