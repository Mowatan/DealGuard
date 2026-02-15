'use client';

import { Info } from 'lucide-react';

interface ServiceFeeDisplayProps {
  serviceTier: 'GOVERNANCE_ADVISORY' | 'DOCUMENT_CUSTODY' | 'FINANCIAL_ESCROW';
  estimatedValue?: number;
  currency: string;
  calculatedFee: number;
  breakdown?: {
    basePercentage?: number;
    percentageFee?: number;
    minimumFee?: number;
    storageFee?: number;
    appliedFee: number;
  };
}

export default function ServiceFeeDisplay({
  serviceTier,
  estimatedValue,
  currency,
  calculatedFee,
  breakdown,
}: ServiceFeeDisplayProps) {
  const tierNames = {
    GOVERNANCE_ADVISORY: 'Governance & Advisory',
    DOCUMENT_CUSTODY: 'Document Custody',
    FINANCIAL_ESCROW: 'Financial Escrow',
  };

  return (
    <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-blue-700" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-2">
            Estimated Service Fee
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-800">Service Tier:</span>
              <span className="font-medium text-blue-900">{tierNames[serviceTier]}</span>
            </div>

            {estimatedValue && estimatedValue > 0 && (
              <div className="flex justify-between">
                <span className="text-blue-800">Deal Value:</span>
                <span className="font-medium text-blue-900">
                  {estimatedValue.toLocaleString()} {currency}
                </span>
              </div>
            )}

            {breakdown && breakdown.basePercentage && (
              <div className="flex justify-between">
                <span className="text-blue-800">Base Rate:</span>
                <span className="font-medium text-blue-900">{breakdown.basePercentage}%</span>
              </div>
            )}

            {breakdown && breakdown.storageFee && (
              <div className="flex justify-between">
                <span className="text-blue-800">Storage Fee:</span>
                <span className="font-medium text-blue-900">
                  {breakdown.storageFee.toLocaleString()} EGP
                </span>
              </div>
            )}

            {breakdown && breakdown.minimumFee && breakdown.percentageFee && breakdown.percentageFee < breakdown.minimumFee && (
              <div className="flex justify-between text-xs">
                <span className="text-blue-700">(Minimum fee applied)</span>
              </div>
            )}

            <div className="pt-2 mt-2 border-t border-blue-200 flex justify-between">
              <span className="font-semibold text-blue-900">Total Service Fee:</span>
              <span className="text-xl font-bold text-blue-900">
                {calculatedFee.toLocaleString()} EGP
              </span>
            </div>
          </div>

          <p className="text-xs text-blue-700 mt-3">
            * Final fee will be calculated at deal creation and invoiced separately
          </p>
        </div>
      </div>
    </div>
  );
}
