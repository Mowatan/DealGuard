import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number with thousand separators (commas)
 * @param value - The number to format
 * @param options - Optional Intl.NumberFormat options
 * @returns Formatted string with commas (e.g., "1,000" or "1,000,000")
 */
export function formatNumber(
  value: number | string | undefined | null,
  options?: Intl.NumberFormatOptions
): string {
  if (value === undefined || value === null || value === '') {
    return '0'
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) {
    return '0'
  }

  return numValue.toLocaleString('en-US', options)
}

/**
 * Formats currency with thousand separators
 * @param amount - The amount to format
 * @param currency - Currency code (e.g., 'EGP', 'USD')
 * @returns Formatted string (e.g., "1,000 EGP")
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  currency: string = 'EGP'
): string {
  return `${formatNumber(amount)} ${currency}`
}
