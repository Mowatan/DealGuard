/**
 * Service Tier Fee Calculator
 *
 * Calculates service fees based on deal tier and estimated value.
 * Provides centralized fee logic used by both backend and frontend.
 */

export enum ServiceTier {
  GOVERNANCE_ADVISORY = 'GOVERNANCE_ADVISORY',
  DOCUMENT_CUSTODY = 'DOCUMENT_CUSTODY',
  FINANCIAL_ESCROW = 'FINANCIAL_ESCROW',
}

export interface FeeCalculationInput {
  serviceTier: ServiceTier;
  estimatedValue?: number;
  currency: string;
}

export interface FeeCalculationResult {
  serviceFee: number;
  breakdown: {
    basePercentage?: number;
    percentageFee?: number;
    minimumFee?: number;
    storageFee?: number;
    appliedFee: number;
  };
}

// Currency conversion rates to EGP (Egyptian Pound)
// In production, these should come from an external API or database
const EGP_RATES: Record<string, number> = {
  EGP: 1,
  USD: 49.5,
  EUR: 53.2,
  GBP: 62.1,
  AED: 13.5,
  SAR: 13.2,
};

/**
 * Converts an amount to EGP using current exchange rates
 */
function convertToEGP(amount: number, currency: string): number {
  const rate = EGP_RATES[currency] || 1;
  return amount * rate;
}

/**
 * Calculates the service fee based on tier and deal value
 *
 * Tier 1 (GOVERNANCE_ADVISORY):
 * - 0.5% of deal value
 * - Minimum: 5,000 EGP
 *
 * Tier 2 (DOCUMENT_CUSTODY):
 * - 0.75% of deal value
 * - Plus: 2,000 EGP fixed storage fee
 * - Minimum: 7,500 EGP (covers minimum percentage + storage)
 *
 * Tier 3 (FINANCIAL_ESCROW):
 * - Tiered percentage based on deal size:
 *   * 3% for deals < 5M EGP
 *   * 2% for deals 5M-10M EGP
 *   * 1.5% for deals >= 10M EGP
 * - Minimum: 25,000 EGP
 */
export function calculateServiceFee(input: FeeCalculationInput): FeeCalculationResult {
  const { serviceTier, estimatedValue, currency } = input;

  // Tier 1: Fixed minimum fee (no value needed)
  if (serviceTier === ServiceTier.GOVERNANCE_ADVISORY) {
    return {
      serviceFee: 5000,
      breakdown: {
        basePercentage: 0.5,
        minimumFee: 5000,
        appliedFee: 5000,
      },
    };
  }

  // Tiers 2 & 3 require estimated value
  if (!estimatedValue || estimatedValue <= 0) {
    throw new Error(`Estimated value is required for ${serviceTier}`);
  }

  // Convert to EGP for consistent calculation
  const egpValue = convertToEGP(estimatedValue, currency);

  // Tier 2: Document Custody
  if (serviceTier === ServiceTier.DOCUMENT_CUSTODY) {
    const percentageFee = egpValue * 0.0075; // 0.75%
    const storageFee = 2000; // Fixed storage cost
    const totalFee = percentageFee + storageFee;

    return {
      serviceFee: Math.round(totalFee * 100) / 100, // Round to 2 decimals
      breakdown: {
        basePercentage: 0.75,
        percentageFee: Math.round(percentageFee * 100) / 100,
        storageFee,
        appliedFee: Math.round(totalFee * 100) / 100,
      },
    };
  }

  // Tier 3: Financial Escrow
  if (serviceTier === ServiceTier.FINANCIAL_ESCROW) {
    // Tiered percentage based on deal size
    let percentage = 0.03; // 3% default for < 5M
    if (egpValue >= 10000000) {
      percentage = 0.015; // 1.5% for 10M+
    } else if (egpValue >= 5000000) {
      percentage = 0.02; // 2% for 5M-10M
    }

    const percentageFee = egpValue * percentage;
    const minimumFee = 25000;
    const appliedFee = Math.max(percentageFee, minimumFee);

    return {
      serviceFee: Math.round(appliedFee * 100) / 100,
      breakdown: {
        basePercentage: percentage * 100, // Convert to percentage for display
        percentageFee: Math.round(percentageFee * 100) / 100,
        minimumFee,
        appliedFee: Math.round(appliedFee * 100) / 100,
      },
    };
  }

  throw new Error(`Unknown service tier: ${serviceTier}`);
}

/**
 * Validates that a service tier has the required estimated value
 */
export function validateServiceTier(
  serviceTier: ServiceTier,
  estimatedValue?: number
): { valid: boolean; error?: string } {
  // Tier 1: No value validation needed
  if (serviceTier === ServiceTier.GOVERNANCE_ADVISORY) {
    return { valid: true };
  }

  // Tiers 2 & 3: Require estimated value
  if (!estimatedValue || estimatedValue <= 0) {
    return {
      valid: false,
      error: `Estimated value is required for ${serviceTier} tier`,
    };
  }

  // Tier 3: Recommended minimum value check
  if (serviceTier === ServiceTier.FINANCIAL_ESCROW) {
    if (estimatedValue < 1000000) {
      // Warning, not error - still allow creation
      console.warn(
        `Financial Escrow tier is recommended for transactions above 1M EGP. Current value: ${estimatedValue}`
      );
    }
  }

  return { valid: true };
}

/**
 * Gets a human-readable tier name
 */
export function getTierDisplayName(tier: ServiceTier): string {
  const names: Record<ServiceTier, string> = {
    [ServiceTier.GOVERNANCE_ADVISORY]: 'Governance & Advisory',
    [ServiceTier.DOCUMENT_CUSTODY]: 'Document Custody',
    [ServiceTier.FINANCIAL_ESCROW]: 'Financial Escrow',
  };
  return names[tier] || tier;
}

/**
 * Gets tier description
 */
export function getTierDescription(tier: ServiceTier): string {
  const descriptions: Record<ServiceTier, string> = {
    [ServiceTier.GOVERNANCE_ADVISORY]:
      'Coordination and monitoring without custody',
    [ServiceTier.DOCUMENT_CUSTODY]:
      'Secure document escrow + all Tier 1 features',
    [ServiceTier.FINANCIAL_ESCROW]:
      'Full paymaster service + all Tier 1 & 2 features',
  };
  return descriptions[tier] || '';
}
