'use client';

import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ArrowRight,
  Banknote,
  Package,
} from 'lucide-react';
import { MilestoneConfig } from './MilestoneBuilder';

interface MilestoneTimelineProps {
  milestones: MilestoneConfig[];
  currentMilestoneId?: string;
  completedMilestoneIds?: string[];
}

const statusIcons = {
  COMPLETED: CheckCircle2,
  IN_PROGRESS: Clock,
  PENDING: Circle,
  DISPUTED: AlertCircle,
};

const statusColors = {
  COMPLETED: 'text-green-600 bg-green-100',
  IN_PROGRESS: 'text-blue-600 bg-blue-100',
  PENDING: 'text-slate-400 bg-slate-100',
  DISPUTED: 'text-red-600 bg-red-100',
};

export default function MilestoneTimeline({
  milestones,
  currentMilestoneId,
  completedMilestoneIds = [],
}: MilestoneTimelineProps) {
  const getMilestoneStatus = (milestone: MilestoneConfig): keyof typeof statusIcons => {
    if (completedMilestoneIds.includes(milestone.id)) return 'COMPLETED';
    if (currentMilestoneId === milestone.id) return 'IN_PROGRESS';
    return 'PENDING';
  };

  const getTriggerDescription = (milestone: MilestoneConfig): string => {
    switch (milestone.triggerType) {
      case 'IMMEDIATE':
        return 'Starts immediately';
      case 'TIME_BASED':
        if (milestone.triggerConfig?.timeDelay) {
          const delay = milestone.triggerConfig.timeDelay;
          return `${delay.value} ${delay.unit} after ${
            delay.afterMilestoneId ? 'previous milestone' : 'deal creation'
          }`;
        }
        if (milestone.triggerConfig?.specificDate) {
          return `On ${new Date(
            milestone.triggerConfig.specificDate
          ).toLocaleDateString()}`;
        }
        return 'Time-based trigger';
      case 'PERFORMANCE_BASED':
        return 'When previous milestone completes';
      case 'KPI_BASED':
        return milestone.triggerConfig?.conditionDescription || 'Custom KPI condition';
      case 'HYBRID':
        return 'Multiple conditions required';
      default:
        return 'Unknown trigger';
    }
  };

  if (milestones.length === 0) {
    return (
      <div className="text-center py-8 text-slate-600">
        No milestones to display
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Transaction Timeline
        </h3>
        <p className="text-sm text-slate-600">
          Visual flow of milestones with dependencies and triggers
        </p>
      </div>

      <div className="relative">
        {milestones.map((milestone, index) => {
          const status = getMilestoneStatus(milestone);
          const StatusIcon = statusIcons[status];
          const isLast = index === milestones.length - 1;
          const TypeIcon =
            milestone.milestoneType === 'PAYMENT' ? Banknote : Package;

          return (
            <div key={milestone.id} className="relative">
              {/* Milestone card */}
              <div className="flex gap-4">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  {/* Icon */}
                  <div
                    className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${statusColors[status]} border-2
                    ${
                      status === 'COMPLETED'
                        ? 'border-green-600'
                        : status === 'IN_PROGRESS'
                        ? 'border-blue-600'
                        : 'border-slate-300'
                    }
                  `}
                  >
                    <StatusIcon className="w-6 h-6" />
                  </div>

                  {/* Connecting line */}
                  {!isLast && (
                    <div
                      className={`
                      w-0.5 flex-1 min-h-[80px]
                      ${
                        status === 'COMPLETED'
                          ? 'bg-green-600'
                          : 'bg-slate-300'
                      }
                    `}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div
                    className={`
                    border-2 rounded-lg p-4
                    ${
                      status === 'IN_PROGRESS'
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : status === 'COMPLETED'
                        ? 'border-green-600 bg-green-50'
                        : 'border-slate-200 bg-white'
                    }
                  `}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-500">
                            MILESTONE {milestone.order}
                          </span>
                          <TypeIcon
                            className={`w-4 h-4 ${
                              milestone.milestoneType === 'PAYMENT'
                                ? 'text-green-600'
                                : 'text-purple-600'
                            }`}
                          />
                        </div>
                        <h4 className="font-semibold text-slate-900 text-lg">
                          {milestone.name}
                        </h4>
                        {milestone.description && (
                          <p className="text-sm text-slate-600 mt-1">
                            {milestone.description}
                          </p>
                        )}
                      </div>

                      {/* Status badge */}
                      <span
                        className={`
                        px-3 py-1 rounded-full text-xs font-semibold
                        ${
                          status === 'COMPLETED'
                            ? 'bg-green-100 text-green-700'
                            : status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }
                      `}
                      >
                        {status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      {/* Type */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Type:</span>
                        <span className="font-medium text-slate-900">
                          {milestone.milestoneType === 'PAYMENT'
                            ? '💰 Payment'
                            : '📦 Performance'}
                        </span>
                      </div>

                      {/* Amount (for payment milestones) */}
                      {milestone.milestoneType === 'PAYMENT' &&
                        milestone.amount && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">Amount:</span>
                            <span className="font-semibold text-green-700">
                              {milestone.amount.toLocaleString()} EGP
                            </span>
                          </div>
                        )}

                      {/* Delivery (for performance milestones) */}
                      {milestone.milestoneType === 'PERFORMANCE' &&
                        milestone.deliveryDetails?.what && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">Delivery:</span>
                            <span className="font-medium text-slate-900">
                              {milestone.deliveryDetails.what}
                              {milestone.deliveryDetails.quantity > 0 &&
                                ` (${milestone.deliveryDetails.quantity} ${milestone.deliveryDetails.unit})`}
                            </span>
                          </div>
                        )}

                      {/* Trigger */}
                      <div className="flex items-start gap-2 mt-3 pt-3 border-t border-slate-200">
                        <Clock className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                          <span className="text-slate-600 text-xs uppercase tracking-wide">
                            Trigger:
                          </span>
                          <p className="text-slate-900 font-medium">
                            {getTriggerDescription(milestone)}
                          </p>
                        </div>
                      </div>

                      {/* Evidence requirements count */}
                      {milestone.evidenceRequirements.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          📎 {milestone.evidenceRequirements.length} evidence
                          requirement(s)
                        </div>
                      )}

                      {/* Approval requirements */}
                      {(milestone.requireAdminApproval ||
                        milestone.requireBuyerApproval ||
                        milestone.requireSellerApproval) && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-600">Approvals:</span>
                          <div className="flex gap-1">
                            {milestone.requireAdminApproval && (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                                Admin
                              </span>
                            )}
                            {milestone.requireBuyerApproval && (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                                Buyer
                              </span>
                            )}
                            {milestone.requireSellerApproval && (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                                Seller
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="text-xs text-slate-600 uppercase">Total</div>
          <div className="text-2xl font-bold text-slate-900">
            {milestones.length}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-700 uppercase">Completed</div>
          <div className="text-2xl font-bold text-green-700">
            {completedMilestoneIds.length}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-700 uppercase">In Progress</div>
          <div className="text-2xl font-bold text-blue-700">
            {currentMilestoneId ? 1 : 0}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="text-xs text-slate-600 uppercase">Pending</div>
          <div className="text-2xl font-bold text-slate-600">
            {
              milestones.filter(
                (m) =>
                  !completedMilestoneIds.includes(m.id) &&
                  m.id !== currentMilestoneId
              ).length
            }
          </div>
        </div>
      </div>
    </div>
  );
}
