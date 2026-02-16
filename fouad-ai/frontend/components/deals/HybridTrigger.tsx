'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import TimeBasedTrigger, {
  TimeBasedTriggerConfig,
} from './TimeBasedTrigger';
import PerformanceBasedTrigger, {
  PerformanceBasedTriggerConfig,
} from './PerformanceBasedTrigger';

export interface HybridTriggerConfig {
  allConditions: Array<{
    type: 'time' | 'performance' | 'custom';
    config: TimeBasedTriggerConfig | PerformanceBasedTriggerConfig | { description: string };
  }>;
}

interface HybridTriggerProps {
  value: HybridTriggerConfig;
  onChange: (config: HybridTriggerConfig) => void;
  milestones: Array<{ id: string; order: number; name: string }>;
  currentMilestoneOrder: number;
  errors?: { [key: string]: string };
}

export default function HybridTrigger({
  value,
  onChange,
  milestones,
  currentMilestoneOrder,
  errors = {},
}: HybridTriggerProps) {
  const [enableTime, setEnableTime] = useState(
    value.allConditions?.some((c) => c.type === 'time') || false
  );
  const [enablePerformance, setEnablePerformance] = useState(
    value.allConditions?.some((c) => c.type === 'performance') || false
  );
  const [enableCustom, setEnableCustom] = useState(
    value.allConditions?.some((c) => c.type === 'custom') || false
  );

  const getCondition = (type: 'time' | 'performance' | 'custom') => {
    return value.allConditions?.find((c) => c.type === type);
  };

  const updateCondition = (
    type: 'time' | 'performance' | 'custom',
    config: any
  ) => {
    const otherConditions =
      value.allConditions?.filter((c) => c.type !== type) || [];
    onChange({
      allConditions: [...otherConditions, { type, config }],
    });
  };

  const removeCondition = (type: 'time' | 'performance' | 'custom') => {
    onChange({
      allConditions: value.allConditions?.filter((c) => c.type !== type) || [],
    });
  };

  const handleCheckboxChange = (
    type: 'time' | 'performance' | 'custom',
    checked: boolean
  ) => {
    if (type === 'time') {
      setEnableTime(checked);
      if (!checked) removeCondition('time');
      else
        updateCondition('time', {
          timeDelay: { value: 30, unit: 'days' },
        });
    } else if (type === 'performance') {
      setEnablePerformance(checked);
      if (!checked) removeCondition('performance');
      else
        updateCondition('performance', {
          dependsOnMilestoneId: '',
          requiredStatuses: [],
        });
    } else if (type === 'custom') {
      setEnableCustom(checked);
      if (!checked) removeCondition('custom');
      else updateCondition('custom', { description: '' });
    }
  };

  const timeCondition = getCondition('time');
  const performanceCondition = getCondition('performance');
  const customCondition = getCondition('custom');

  const hasAnyCondition = enableTime || enablePerformance || enableCustom;

  return (
    <div className="space-y-4 p-4 bg-pink-50 border border-pink-200 rounded-lg">
      <h4 className="font-semibold text-pink-900">
        Hybrid Trigger Configuration
      </h4>
      <p className="text-sm text-slate-700">
        Select multiple conditions that ALL must be met to activate this milestone
      </p>

      {/* Condition type selectors */}
      <div className="space-y-2 p-3 bg-white border border-pink-200 rounded-lg">
        <Label>Enable Conditions:</Label>

        <div className="flex items-center gap-2">
          <Checkbox
            id="enableTime"
            checked={enableTime}
            onCheckedChange={(checked) =>
              handleCheckboxChange('time', checked as boolean)
            }
          />
          <label
            htmlFor="enableTime"
            className="text-sm font-medium cursor-pointer"
          >
            Time-Based Condition
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="enablePerformance"
            checked={enablePerformance}
            onCheckedChange={(checked) =>
              handleCheckboxChange('performance', checked as boolean)
            }
          />
          <label
            htmlFor="enablePerformance"
            className="text-sm font-medium cursor-pointer"
          >
            Performance-Based Condition
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="enableCustom"
            checked={enableCustom}
            onCheckedChange={(checked) =>
              handleCheckboxChange('custom', checked as boolean)
            }
          />
          <label
            htmlFor="enableCustom"
            className="text-sm font-medium cursor-pointer"
          >
            Custom Condition
          </label>
        </div>
      </div>

      {!hasAnyCondition && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          ⚠️ Please select at least one condition type above
        </div>
      )}

      {/* Time-based condition */}
      {enableTime && (
        <div className="border-t border-pink-200 pt-4">
          <TimeBasedTrigger
            value={timeCondition?.config as TimeBasedTriggerConfig}
            onChange={(config) => updateCondition('time', config)}
            milestones={milestones}
            currentMilestoneOrder={currentMilestoneOrder}
            errors={errors}
          />
        </div>
      )}

      {/* Performance-based condition */}
      {enablePerformance && (
        <div className="border-t border-pink-200 pt-4">
          <PerformanceBasedTrigger
            value={performanceCondition?.config as PerformanceBasedTriggerConfig}
            onChange={(config) => updateCondition('performance', config)}
            milestones={milestones}
            currentMilestoneOrder={currentMilestoneOrder}
            errors={errors}
          />
        </div>
      )}

      {/* Custom condition */}
      {enableCustom && (
        <div className="border-t border-pink-200 pt-4">
          <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <Label htmlFor="customDescription">Custom Condition *</Label>
            <Textarea
              id="customDescription"
              placeholder="Describe any additional condition that must be met..."
              value={
                (customCondition?.config as { description: string })?.description ||
                ''
              }
              onChange={(e) =>
                updateCondition('custom', { description: e.target.value })
              }
              rows={3}
              className={errors.customDescription ? 'border-red-500' : ''}
            />
            {errors.customDescription && (
              <p className="text-red-500 text-sm">{errors.customDescription}</p>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {hasAnyCondition && (
        <div className="bg-white border border-pink-200 rounded-lg p-3 text-sm">
          <strong className="text-pink-900">Trigger Preview:</strong>
          <p className="text-slate-700 mt-1">
            This milestone will activate when <strong>ALL</strong> of the following
            conditions are met:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700">
            {enableTime && timeCondition && (
              <li>
                <strong>Time:</strong>{' '}
                {(timeCondition.config as TimeBasedTriggerConfig).timeDelay
                  ? `${
                      (timeCondition.config as TimeBasedTriggerConfig).timeDelay
                        ?.value
                    } ${
                      (timeCondition.config as TimeBasedTriggerConfig).timeDelay
                        ?.unit
                    } elapsed`
                  : 'Specific date reached'}
              </li>
            )}
            {enablePerformance && performanceCondition && (
              <li>
                <strong>Performance:</strong> Previous milestone completed with
                required conditions
              </li>
            )}
            {enableCustom && customCondition && (
              <li>
                <strong>Custom:</strong>{' '}
                {(customCondition.config as { description: string }).description ||
                  'Custom condition met'}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
