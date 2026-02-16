'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export interface PerformanceBasedTriggerConfig {
  dependsOnMilestoneId: string;
  requiredStatuses: string[];
  evidenceApproved?: boolean;
  adminApproval?: boolean;
  allPartiesApprove?: boolean;
}

interface PerformanceBasedTriggerProps {
  value: PerformanceBasedTriggerConfig;
  onChange: (config: PerformanceBasedTriggerConfig) => void;
  milestones: Array<{ id: string; order: number; name: string }>;
  currentMilestoneOrder: number;
  errors?: { [key: string]: string };
}

const STATUS_OPTIONS = [
  {
    value: 'PAYMENT_RECEIVED',
    label: 'Payment received and verified',
    description: 'Payment has been confirmed',
  },
  {
    value: 'EVIDENCE_SUBMITTED',
    label: 'Evidence submitted',
    description: 'Required evidence uploaded',
  },
  {
    value: 'EVIDENCE_APPROVED',
    label: 'Evidence approved',
    description: 'Evidence has been reviewed and accepted',
  },
  {
    value: 'MILESTONE_APPROVED',
    label: 'Milestone approved',
    description: 'Milestone status is APPROVED',
  },
  {
    value: 'MILESTONE_COMPLETED',
    label: 'Milestone completed',
    description: 'Milestone fully completed',
  },
];

export default function PerformanceBasedTrigger({
  value,
  onChange,
  milestones,
  currentMilestoneOrder,
  errors = {},
}: PerformanceBasedTriggerProps) {
  const previousMilestones = milestones.filter(
    (m) => m.order < currentMilestoneOrder
  );

  const handleMilestoneChange = (milestoneId: string) => {
    onChange({
      ...value,
      dependsOnMilestoneId: milestoneId,
    });
  };

  const handleStatusToggle = (status: string) => {
    const currentStatuses = value.requiredStatuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];

    onChange({
      ...value,
      requiredStatuses: newStatuses,
    });
  };

  const handleCheckboxChange = (field: keyof PerformanceBasedTriggerConfig, checked: boolean) => {
    onChange({
      ...value,
      [field]: checked,
    });
  };

  const selectedMilestone = previousMilestones.find(
    (m) => m.id === value.dependsOnMilestoneId
  );

  return (
    <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <h4 className="font-semibold text-purple-900">
        Performance-Based Trigger Configuration
      </h4>

      <div>
        <Label htmlFor="dependsOnMilestone">Depends on Milestone *</Label>
        <select
          id="dependsOnMilestone"
          value={value.dependsOnMilestoneId || ''}
          onChange={(e) => handleMilestoneChange(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mt-1 ${
            errors.dependsOnMilestoneId ? 'border-red-500' : 'border-slate-300'
          }`}
        >
          <option value="">Select a milestone...</option>
          {previousMilestones.map((m) => (
            <option key={m.id} value={m.id}>
              Milestone {m.order}: {m.name}
            </option>
          ))}
        </select>
        {errors.dependsOnMilestoneId && (
          <p className="text-red-500 text-sm mt-1">{errors.dependsOnMilestoneId}</p>
        )}
        {previousMilestones.length === 0 && (
          <p className="text-amber-700 text-sm mt-1 bg-amber-50 border border-amber-200 rounded p-2">
            ⚠️ No previous milestones available. Performance-based triggers require at
            least one milestone before this one.
          </p>
        )}
      </div>

      {value.dependsOnMilestoneId && (
        <>
          <div>
            <Label>Required Status Conditions *</Label>
            <p className="text-sm text-slate-600 mb-3">
              Select all conditions that must be met
            </p>

            <div className="space-y-2">
              {STATUS_OPTIONS.map((option) => {
                const isChecked = (value.requiredStatuses || []).includes(
                  option.value
                );

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleStatusToggle(option.value)}
                    className={`
                      w-full p-3 border-2 rounded-lg text-left transition-all
                      ${
                        isChecked
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0
                        ${
                          isChecked
                            ? 'border-purple-600 bg-purple-600'
                            : 'border-slate-300 bg-white'
                        }
                      `}
                      >
                        {isChecked && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div
                          className={`font-medium ${
                            isChecked ? 'text-purple-900' : 'text-slate-900'
                          }`}
                        >
                          {option.label}
                        </div>
                        <div className="text-sm text-slate-600">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {errors.requiredStatuses && (
              <p className="text-red-500 text-sm mt-2">{errors.requiredStatuses}</p>
            )}
          </div>

          <div className="border-t border-purple-200 pt-4">
            <Label>Additional Approval Requirements</Label>
            <div className="space-y-2 mt-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="adminApproval"
                  checked={value.adminApproval || false}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange('adminApproval', checked as boolean)
                  }
                />
                <label
                  htmlFor="adminApproval"
                  className="text-sm font-medium cursor-pointer"
                >
                  Admin approval required
                </label>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="allPartiesApprove"
                  checked={value.allPartiesApprove || false}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange('allPartiesApprove', checked as boolean)
                  }
                />
                <label
                  htmlFor="allPartiesApprove"
                  className="text-sm font-medium cursor-pointer"
                >
                  All parties must approve
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white border border-purple-200 rounded-lg p-3 text-sm">
            <strong className="text-purple-900">Trigger Preview:</strong>
            <p className="text-slate-700 mt-1">
              This milestone will activate when{' '}
              <span className="font-semibold">
                Milestone {selectedMilestone?.order}: {selectedMilestone?.name}
              </span>{' '}
              meets the following conditions:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700">
              {(value.requiredStatuses || []).map((status) => {
                const option = STATUS_OPTIONS.find((o) => o.value === status);
                return (
                  <li key={status}>
                    {option?.label || status}
                  </li>
                );
              })}
              {value.adminApproval && <li>Admin approval obtained</li>}
              {value.allPartiesApprove && <li>All parties have approved</li>}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
