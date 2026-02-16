'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import MilestoneTypeSelector, {
  MilestoneType,
} from './MilestoneTypeSelector';
import TriggerSelector, { TriggerType } from './TriggerSelector';
import TimeBasedTrigger, {
  TimeBasedTriggerConfig,
} from './TimeBasedTrigger';
import PerformanceBasedTrigger, {
  PerformanceBasedTriggerConfig,
} from './PerformanceBasedTrigger';
import KPIBasedTrigger, { KPIBasedTriggerConfig } from './KPIBasedTrigger';
import HybridTrigger, { HybridTriggerConfig } from './HybridTrigger';

export interface EvidenceRequirement {
  name: string;
  description: string;
  fileType: string;
  submittedBy: string;
  reviewedBy: string;
}

export interface MilestoneConfig {
  id: string; // Temp ID for frontend management
  order: number;
  name: string;
  description: string;
  milestoneType: MilestoneType;
  triggerType: TriggerType;
  triggerConfig: any; // Depends on triggerType

  // Payment milestone fields
  paymentMethod?: string;
  amount?: number;
  paymentDetails?: any;
  payerPartyId?: string;
  receiverPartyId?: string;

  // Performance milestone fields
  deliveryDetails?: {
    what: string;
    quantity: number;
    unit: string;
  };
  delivererPartyId?: string;

  // Evidence requirements
  evidenceRequirements: EvidenceRequirement[];

  // Approval requirements
  requireAdminApproval: boolean;
  requireBuyerApproval: boolean;
  requireSellerApproval: boolean;
}

interface MilestoneBuilderProps {
  milestones: MilestoneConfig[];
  onChange: (milestones: MilestoneConfig[]) => void;
  parties: Array<{ id: string; name: string; role: string }>;
  currency?: string;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'IN_KIND_ASSET', label: 'In-Kind Asset' },
  { value: 'MIXED', label: 'Mixed (Cash + In-Kind)' },
];

const FILE_TYPES = [
  { value: 'PDF', label: 'PDF' },
  { value: 'IMAGE', label: 'Image (JPG, PNG)' },
  { value: 'DOCUMENT', label: 'Document (PDF, DOCX)' },
  { value: 'ANY', label: 'Any file type' },
];

export default function MilestoneBuilder({
  milestones,
  onChange,
  parties,
  currency = 'EGP',
}: MilestoneBuilderProps) {
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(
    milestones[0]?.id || null
  );

  const addMilestone = () => {
    const newMilestone: MilestoneConfig = {
      id: `temp-${Date.now()}`,
      order: milestones.length + 1,
      name: `Milestone ${milestones.length + 1}`,
      description: '',
      milestoneType: 'PAYMENT',
      triggerType: milestones.length === 0 ? 'IMMEDIATE' : 'TIME_BASED',
      triggerConfig: {},
      evidenceRequirements: [],
      requireAdminApproval: true,
      requireBuyerApproval: false,
      requireSellerApproval: false,
    };
    onChange([...milestones, newMilestone]);
    setExpandedMilestone(newMilestone.id);
  };

  const removeMilestone = (id: string) => {
    const updated = milestones
      .filter((m) => m.id !== id)
      .map((m, index) => ({ ...m, order: index + 1 }));
    onChange(updated);
    if (expandedMilestone === id) {
      setExpandedMilestone(updated[0]?.id || null);
    }
  };

  const updateMilestone = (id: string, updates: Partial<MilestoneConfig>) => {
    onChange(milestones.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const addEvidenceRequirement = (milestoneId: string) => {
    const milestone = milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    const newRequirement: EvidenceRequirement = {
      name: '',
      description: '',
      fileType: 'PDF',
      submittedBy: 'BUYER',
      reviewedBy: 'ADMIN',
    };

    updateMilestone(milestoneId, {
      evidenceRequirements: [
        ...milestone.evidenceRequirements,
        newRequirement,
      ],
    });
  };

  const removeEvidenceRequirement = (milestoneId: string, index: number) => {
    const milestone = milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    updateMilestone(milestoneId, {
      evidenceRequirements: milestone.evidenceRequirements.filter(
        (_, i) => i !== index
      ),
    });
  };

  const updateEvidenceRequirement = (
    milestoneId: string,
    index: number,
    updates: Partial<EvidenceRequirement>
  ) => {
    const milestone = milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    updateMilestone(milestoneId, {
      evidenceRequirements: milestone.evidenceRequirements.map((req, i) =>
        i === index ? { ...req, ...updates } : req
      ),
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedMilestone(expandedMilestone === id ? null : id);
  };

  const renderTriggerConfig = (milestone: MilestoneConfig) => {
    const commonProps = {
      milestones: milestones.map((m) => ({
        id: m.id,
        order: m.order,
        name: m.name,
      })),
      currentMilestoneOrder: milestone.order,
    };

    switch (milestone.triggerType) {
      case 'TIME_BASED':
        return (
          <TimeBasedTrigger
            value={milestone.triggerConfig as TimeBasedTriggerConfig}
            onChange={(config) =>
              updateMilestone(milestone.id, { triggerConfig: config })
            }
            {...commonProps}
          />
        );

      case 'PERFORMANCE_BASED':
        return (
          <PerformanceBasedTrigger
            value={milestone.triggerConfig as PerformanceBasedTriggerConfig}
            onChange={(config) =>
              updateMilestone(milestone.id, { triggerConfig: config })
            }
            {...commonProps}
          />
        );

      case 'KPI_BASED':
        return (
          <KPIBasedTrigger
            value={milestone.triggerConfig as KPIBasedTriggerConfig}
            onChange={(config) =>
              updateMilestone(milestone.id, { triggerConfig: config })
            }
            parties={parties}
          />
        );

      case 'HYBRID':
        return (
          <HybridTrigger
            value={milestone.triggerConfig as HybridTriggerConfig}
            onChange={(config) =>
              updateMilestone(milestone.id, { triggerConfig: config })
            }
            {...commonProps}
          />
        );

      case 'IMMEDIATE':
      default:
        return (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            ✓ This milestone will activate immediately when the deal begins.
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Build Transaction Milestones
          </h3>
          <p className="text-sm text-slate-600">
            Define the staged payments and deliveries for this deal
          </p>
        </div>
        <Button onClick={addMilestone} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
          <DollarSign className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">No milestones defined yet</p>
          <Button onClick={addMilestone} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add First Milestone
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone, index) => {
            const isExpanded = expandedMilestone === milestone.id;

            return (
              <div
                key={milestone.id}
                className="border-2 border-slate-200 rounded-lg bg-white overflow-hidden"
              >
                {/* Milestone Header */}
                <div
                  className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => toggleExpanded(milestone.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                      {milestone.order}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {milestone.name || `Milestone ${milestone.order}`}
                      </h4>
                      <p className="text-sm text-slate-600">
                        {milestone.milestoneType === 'PAYMENT'
                          ? '💰 Payment'
                          : '📦 Performance'}{' '}
                        • {milestone.triggerType.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMilestone(milestone.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                </div>

                {/* Milestone Details (Expanded) */}
                {isExpanded && (
                  <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor={`name-${milestone.id}`}>
                          Milestone Name *
                        </Label>
                        <Input
                          id={`name-${milestone.id}`}
                          value={milestone.name}
                          onChange={(e) =>
                            updateMilestone(milestone.id, { name: e.target.value })
                          }
                          placeholder="e.g., Down Payment, First Delivery"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor={`description-${milestone.id}`}>
                          Description
                        </Label>
                        <Textarea
                          id={`description-${milestone.id}`}
                          value={milestone.description}
                          onChange={(e) =>
                            updateMilestone(milestone.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Describe what happens in this milestone..."
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Milestone Type */}
                    <MilestoneTypeSelector
                      value={milestone.milestoneType}
                      onChange={(type) =>
                        updateMilestone(milestone.id, { milestoneType: type })
                      }
                    />

                    {/* Payment-specific fields */}
                    {milestone.milestoneType === 'PAYMENT' && (
                      <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-semibold text-green-900">
                          Payment Details
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Amount *</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                type="number"
                                value={milestone.amount || ''}
                                onChange={(e) =>
                                  updateMilestone(milestone.id, {
                                    amount: parseFloat(e.target.value),
                                  })
                                }
                                placeholder="0.00"
                              />
                              <span className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-medium">
                                {currency}
                              </span>
                            </div>
                          </div>

                          <div>
                            <Label>Payment Method</Label>
                            <select
                              value={milestone.paymentMethod || 'BANK_TRANSFER'}
                              onChange={(e) =>
                                updateMilestone(milestone.id, {
                                  paymentMethod: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                            >
                              {PAYMENT_METHODS.map((method) => (
                                <option key={method.value} value={method.value}>
                                  {method.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label>Payer</Label>
                            <select
                              value={milestone.payerPartyId || ''}
                              onChange={(e) =>
                                updateMilestone(milestone.id, {
                                  payerPartyId: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                            >
                              <option value="">Select party...</option>
                              {parties.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.role})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <Label>Receiver</Label>
                            <select
                              value={milestone.receiverPartyId || ''}
                              onChange={(e) =>
                                updateMilestone(milestone.id, {
                                  receiverPartyId: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                            >
                              <option value="">Select party...</option>
                              {parties.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.role})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Performance-specific fields */}
                    {milestone.milestoneType === 'PERFORMANCE' && (
                      <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="font-semibold text-purple-900">
                          Performance Details
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-3">
                            <Label>What is delivered? *</Label>
                            <Input
                              value={milestone.deliveryDetails?.what || ''}
                              onChange={(e) =>
                                updateMilestone(milestone.id, {
                                  deliveryDetails: {
                                    ...milestone.deliveryDetails,
                                    what: e.target.value,
                                    quantity: milestone.deliveryDetails?.quantity || 0,
                                    unit: milestone.deliveryDetails?.unit || '',
                                  },
                                })
                              }
                              placeholder="e.g., Transfer 50% of shares, Deliver product units"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              value={milestone.deliveryDetails?.quantity || ''}
                              onChange={(e) =>
                                updateMilestone(milestone.id, {
                                  deliveryDetails: {
                                    ...milestone.deliveryDetails,
                                    what: milestone.deliveryDetails?.what || '',
                                    quantity: parseFloat(e.target.value),
                                    unit: milestone.deliveryDetails?.unit || '',
                                  },
                                })
                              }
                              placeholder="0"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label>Unit</Label>
                            <Input
                              value={milestone.deliveryDetails?.unit || ''}
                              onChange={(e) =>
                                updateMilestone(milestone.id, {
                                  deliveryDetails: {
                                    ...milestone.deliveryDetails,
                                    what: milestone.deliveryDetails?.what || '',
                                    quantity: milestone.deliveryDetails?.quantity || 0,
                                    unit: e.target.value,
                                  },
                                })
                              }
                              placeholder="e.g., shares, sqm, units"
                              className="mt-1"
                            />
                          </div>

                          <div>
                            <Label>Deliverer</Label>
                            <select
                              value={milestone.delivererPartyId || ''}
                              onChange={(e) =>
                                updateMilestone(milestone.id, {
                                  delivererPartyId: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                            >
                              <option value="">Select party...</option>
                              {parties.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.role})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Trigger Type */}
                    <TriggerSelector
                      value={milestone.triggerType}
                      onChange={(type) =>
                        updateMilestone(milestone.id, {
                          triggerType: type,
                          triggerConfig: {},
                        })
                      }
                      milestoneNumber={milestone.order}
                    />

                    {/* Trigger Configuration */}
                    {milestone.triggerType !== 'IMMEDIATE' &&
                      renderTriggerConfig(milestone)}

                    {/* Evidence Requirements */}
                    <div className="border-t border-slate-200 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-base">Evidence Requirements</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addEvidenceRequirement(milestone.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Evidence
                        </Button>
                      </div>

                      {milestone.evidenceRequirements.length === 0 ? (
                        <p className="text-sm text-slate-600 italic">
                          No evidence requirements defined
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {milestone.evidenceRequirements.map((req, reqIndex) => (
                            <div
                              key={reqIndex}
                              className="p-3 border border-slate-200 rounded-lg bg-slate-50 relative"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  removeEvidenceRequirement(milestone.id, reqIndex)
                                }
                                className="absolute top-3 right-3 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                                <div>
                                  <Label className="text-sm">Evidence Name</Label>
                                  <Input
                                    value={req.name}
                                    onChange={(e) =>
                                      updateEvidenceRequirement(
                                        milestone.id,
                                        reqIndex,
                                        { name: e.target.value }
                                      )
                                    }
                                    placeholder="e.g., Share transfer certificate"
                                    className="mt-1 text-sm"
                                  />
                                </div>

                                <div>
                                  <Label className="text-sm">File Type</Label>
                                  <select
                                    value={req.fileType}
                                    onChange={(e) =>
                                      updateEvidenceRequirement(
                                        milestone.id,
                                        reqIndex,
                                        { fileType: e.target.value }
                                      )
                                    }
                                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                                  >
                                    {FILE_TYPES.map((type) => (
                                      <option key={type.value} value={type.value}>
                                        {type.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="md:col-span-2">
                                  <Label className="text-sm">Description</Label>
                                  <Textarea
                                    value={req.description}
                                    onChange={(e) =>
                                      updateEvidenceRequirement(
                                        milestone.id,
                                        reqIndex,
                                        { description: e.target.value }
                                      )
                                    }
                                    placeholder="Describe what this evidence should contain..."
                                    rows={2}
                                    className="mt-1 text-sm"
                                  />
                                </div>

                                <div>
                                  <Label className="text-sm">Submitted By</Label>
                                  <select
                                    value={req.submittedBy}
                                    onChange={(e) =>
                                      updateEvidenceRequirement(
                                        milestone.id,
                                        reqIndex,
                                        { submittedBy: e.target.value }
                                      )
                                    }
                                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                                  >
                                    <option value="BUYER">Buyer</option>
                                    <option value="SELLER">Seller</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="OTHER">Other Party</option>
                                  </select>
                                </div>

                                <div>
                                  <Label className="text-sm">Reviewed By</Label>
                                  <select
                                    value={req.reviewedBy}
                                    onChange={(e) =>
                                      updateEvidenceRequirement(
                                        milestone.id,
                                        reqIndex,
                                        { reviewedBy: e.target.value }
                                      )
                                    }
                                    className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                                  >
                                    <option value="ADMIN">Admin</option>
                                    <option value="BUYER">Buyer</option>
                                    <option value="SELLER">Seller</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Approval Requirements */}
                    <div className="border-t border-slate-200 pt-6">
                      <Label className="text-base mb-3 block">
                        Approval Requirements
                      </Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`admin-approval-${milestone.id}`}
                            checked={milestone.requireAdminApproval}
                            onCheckedChange={(checked) =>
                              updateMilestone(milestone.id, {
                                requireAdminApproval: checked as boolean,
                              })
                            }
                          />
                          <label
                            htmlFor={`admin-approval-${milestone.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            Admin approval required
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`buyer-approval-${milestone.id}`}
                            checked={milestone.requireBuyerApproval}
                            onCheckedChange={(checked) =>
                              updateMilestone(milestone.id, {
                                requireBuyerApproval: checked as boolean,
                              })
                            }
                          />
                          <label
                            htmlFor={`buyer-approval-${milestone.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            Buyer approval required
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`seller-approval-${milestone.id}`}
                            checked={milestone.requireSellerApproval}
                            onCheckedChange={(checked) =>
                              updateMilestone(milestone.id, {
                                requireSellerApproval: checked as boolean,
                              })
                            }
                          />
                          <label
                            htmlFor={`seller-approval-${milestone.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            Seller approval required
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {milestones.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">
            Milestone Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-600">Total Milestones</div>
              <div className="text-xl font-bold text-blue-900">
                {milestones.length}
              </div>
            </div>
            <div>
              <div className="text-slate-600">Payment Milestones</div>
              <div className="text-xl font-bold text-blue-900">
                {milestones.filter((m) => m.milestoneType === 'PAYMENT').length}
              </div>
            </div>
            <div>
              <div className="text-slate-600">Performance Milestones</div>
              <div className="text-xl font-bold text-blue-900">
                {
                  milestones.filter((m) => m.milestoneType === 'PERFORMANCE')
                    .length
                }
              </div>
            </div>
            <div>
              <div className="text-slate-600">Total Value</div>
              <div className="text-xl font-bold text-blue-900">
                {milestones
                  .filter((m) => m.milestoneType === 'PAYMENT' && m.amount)
                  .reduce((sum, m) => sum + (m.amount || 0), 0)
                  .toFixed(2)}{' '}
                {currency}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
