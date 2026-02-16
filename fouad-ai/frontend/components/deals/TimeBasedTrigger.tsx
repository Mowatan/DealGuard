'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export interface TimeBasedTriggerConfig {
  timeDelay?: {
    value: number;
    unit: 'days' | 'weeks' | 'months';
    afterMilestoneId?: string; // null = deal creation, or specific milestone ID
  };
  specificDate?: string; // ISO date string
}

interface TimeBasedTriggerProps {
  value: TimeBasedTriggerConfig;
  onChange: (config: TimeBasedTriggerConfig) => void;
  milestones: Array<{ id: string; order: number; name: string }>;
  currentMilestoneOrder: number;
  errors?: { [key: string]: string };
}

export default function TimeBasedTrigger({
  value,
  onChange,
  milestones,
  currentMilestoneOrder,
  errors = {},
}: TimeBasedTriggerProps) {
  const [mode, setMode] = useState<'delay' | 'date'>(
    value.specificDate ? 'date' : 'delay'
  );

  // Filter previous milestones only
  const previousMilestones = milestones.filter(
    (m) => m.order < currentMilestoneOrder
  );

  const handleModeChange = (newMode: 'delay' | 'date') => {
    setMode(newMode);
    if (newMode === 'delay') {
      onChange({
        timeDelay: {
          value: value.timeDelay?.value || 30,
          unit: value.timeDelay?.unit || 'days',
          afterMilestoneId: value.timeDelay?.afterMilestoneId,
        },
        specificDate: undefined,
      });
    } else {
      onChange({
        timeDelay: undefined,
        specificDate: value.specificDate || new Date().toISOString(),
      });
    }
  };

  const handleDelayChange = (field: 'value' | 'unit' | 'afterMilestoneId', newValue: any) => {
    onChange({
      ...value,
      timeDelay: {
        ...value.timeDelay,
        value: value.timeDelay?.value || 30,
        unit: value.timeDelay?.unit || 'days',
        [field]: newValue,
      } as TimeBasedTriggerConfig['timeDelay'],
    });
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      onChange({
        ...value,
        specificDate: date.toISOString(),
      });
    }
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="font-semibold text-blue-900">Time-Based Trigger Configuration</h4>

      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleModeChange('delay')}
          className={`
            flex-1 px-4 py-2 rounded-lg font-medium transition-all
            ${
              mode === 'delay'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-300'
            }
          `}
        >
          Time Delay
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('date')}
          className={`
            flex-1 px-4 py-2 rounded-lg font-medium transition-all
            ${
              mode === 'date'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-300'
            }
          `}
        >
          Specific Date
        </button>
      </div>

      {mode === 'delay' ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="timeDelayValue">Starts After *</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="timeDelayValue"
                type="number"
                min="1"
                value={value.timeDelay?.value || 30}
                onChange={(e) =>
                  handleDelayChange('value', parseInt(e.target.value, 10))
                }
                className={`flex-1 ${errors.timeDelayValue ? 'border-red-500' : ''}`}
              />
              <select
                value={value.timeDelay?.unit || 'days'}
                onChange={(e) => handleDelayChange('unit', e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
            {errors.timeDelayValue && (
              <p className="text-red-500 text-sm mt-1">{errors.timeDelayValue}</p>
            )}
          </div>

          <div>
            <Label htmlFor="afterMilestone">After</Label>
            <select
              id="afterMilestone"
              value={value.timeDelay?.afterMilestoneId || ''}
              onChange={(e) =>
                handleDelayChange('afterMilestoneId', e.target.value || undefined)
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
            >
              <option value="">Deal Creation</option>
              {previousMilestones.map((m) => (
                <option key={m.id} value={m.id}>
                  Milestone {m.order}: {m.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-600 mt-1">
              Choose when the countdown starts
            </p>
          </div>

          {/* Preview */}
          <div className="bg-white border border-blue-200 rounded-lg p-3 text-sm">
            <strong className="text-blue-900">Trigger Preview:</strong>
            <p className="text-slate-700 mt-1">
              This milestone will activate{' '}
              <span className="font-semibold">
                {value.timeDelay?.value || 30} {value.timeDelay?.unit || 'days'}
              </span>{' '}
              after{' '}
              <span className="font-semibold">
                {value.timeDelay?.afterMilestoneId
                  ? previousMilestones.find(
                      (m) => m.id === value.timeDelay?.afterMilestoneId
                    )?.name || 'previous milestone'
                  : 'deal creation'}
              </span>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label>Select Activation Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal mt-1 ${
                    errors.specificDate ? 'border-red-500' : ''
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value.specificDate
                    ? format(new Date(value.specificDate), 'PPP')
                    : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    value.specificDate ? new Date(value.specificDate) : undefined
                  }
                  onSelect={handleDateChange}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.specificDate && (
              <p className="text-red-500 text-sm mt-1">{errors.specificDate}</p>
            )}
          </div>

          {/* Preview */}
          {value.specificDate && (
            <div className="bg-white border border-blue-200 rounded-lg p-3 text-sm">
              <strong className="text-blue-900">Trigger Preview:</strong>
              <p className="text-slate-700 mt-1">
                This milestone will activate on{' '}
                <span className="font-semibold">
                  {format(new Date(value.specificDate), 'MMMM d, yyyy')}
                </span>
                .
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
