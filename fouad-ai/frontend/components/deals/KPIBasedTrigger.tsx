'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface KPIBasedTriggerConfig {
  conditionDescription: string;
  kpiMetric?: string;
  targetValue?: string;
  verifiedBy: string;
}

interface KPIBasedTriggerProps {
  value: KPIBasedTriggerConfig;
  onChange: (config: KPIBasedTriggerConfig) => void;
  parties: Array<{ id: string; name: string; role: string }>;
  errors?: { [key: string]: string };
}

const VERIFIER_OPTIONS = [
  { value: 'ADMIN', label: 'Admin / DealGuard' },
  { value: 'BUYER', label: 'Buyer' },
  { value: 'SELLER', label: 'Seller' },
  { value: 'THIRD_PARTY', label: 'Third Party / Inspector' },
  { value: 'MUTUAL', label: 'Mutual Agreement (All Parties)' },
];

export default function KPIBasedTrigger({
  value,
  onChange,
  parties,
  errors = {},
}: KPIBasedTriggerProps) {
  const handleChange = (field: keyof KPIBasedTriggerConfig, newValue: string) => {
    onChange({
      ...value,
      [field]: newValue,
    });
  };

  return (
    <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <h4 className="font-semibold text-orange-900">
        KPI-Based Trigger Configuration
      </h4>

      <div>
        <Label htmlFor="conditionDescription">Condition Description *</Label>
        <Textarea
          id="conditionDescription"
          placeholder="e.g., Sales target of $100,000 reached, Inspection score of 85% or higher, Property appraisal completed..."
          value={value.conditionDescription || ''}
          onChange={(e) => handleChange('conditionDescription', e.target.value)}
          rows={3}
          className={`mt-1 ${errors.conditionDescription ? 'border-red-500' : ''}`}
        />
        {errors.conditionDescription && (
          <p className="text-red-500 text-sm mt-1">{errors.conditionDescription}</p>
        )}
        <p className="text-xs text-slate-600 mt-1">
          Describe the custom condition that must be met to activate this milestone
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="kpiMetric">KPI Metric (Optional)</Label>
          <Input
            id="kpiMetric"
            placeholder="e.g., Sales, Score, Completion %"
            value={value.kpiMetric || ''}
            onChange={(e) => handleChange('kpiMetric', e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-slate-600 mt-1">
            Name of the measurable metric
          </p>
        </div>

        <div>
          <Label htmlFor="targetValue">Target Value (Optional)</Label>
          <Input
            id="targetValue"
            placeholder="e.g., $100,000, 85%, Complete"
            value={value.targetValue || ''}
            onChange={(e) => handleChange('targetValue', e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-slate-600 mt-1">
            Target value to be achieved
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="verifiedBy">Verified By *</Label>
        <select
          id="verifiedBy"
          value={value.verifiedBy || ''}
          onChange={(e) => handleChange('verifiedBy', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mt-1 ${
            errors.verifiedBy ? 'border-red-500' : 'border-slate-300'
          }`}
        >
          <option value="">Select who verifies...</option>
          {VERIFIER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.verifiedBy && (
          <p className="text-red-500 text-sm mt-1">{errors.verifiedBy}</p>
        )}
        <p className="text-xs text-slate-600 mt-1">
          Who is responsible for confirming this condition is met
        </p>
      </div>

      {/* Example scenarios */}
      <div className="bg-white border border-orange-200 rounded-lg p-3 text-sm">
        <strong className="text-orange-900">Example KPI Scenarios:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700">
          <li>
            <strong>Sales Target:</strong> Revenue reaches $500,000 (verified by
            accountant)
          </li>
          <li>
            <strong>Quality Inspection:</strong> Property passes inspection with 90%+
            score (verified by inspector)
          </li>
          <li>
            <strong>Permit Approval:</strong> Construction permit approved by
            municipality (verified by seller)
          </li>
          <li>
            <strong>User Milestone:</strong> Product reaches 10,000 active users
            (verified by buyer)
          </li>
          <li>
            <strong>Time + Performance:</strong> 30 days after deal start AND first
            milestone complete
          </li>
        </ul>
      </div>

      {/* Preview */}
      {value.conditionDescription && value.verifiedBy && (
        <div className="bg-white border border-orange-200 rounded-lg p-3 text-sm">
          <strong className="text-orange-900">Trigger Preview:</strong>
          <p className="text-slate-700 mt-1">
            This milestone will activate when: <br />
            <span className="font-semibold">{value.conditionDescription}</span>
          </p>
          {value.kpiMetric && value.targetValue && (
            <p className="text-slate-700 mt-1">
              <strong>Target:</strong> {value.kpiMetric} = {value.targetValue}
            </p>
          )}
          <p className="text-slate-700 mt-1">
            <strong>Verified by:</strong>{' '}
            {VERIFIER_OPTIONS.find((o) => o.value === value.verifiedBy)?.label ||
              value.verifiedBy}
          </p>
        </div>
      )}
    </div>
  );
}
