// Central currency configuration for the platform
// All monetary values are in BDT (Bangladeshi Taka)

export const DEFAULT_CURRENCY = 'BDT';
export const CURRENCY_SYMBOL = '৳';
export const CURRENCY_LOCALE = 'en-BD';

/**
 * Format a number as BDT currency
 * @param amount - The amount to format
 * @param _currency - Deprecated: kept for backwards compatibility, always uses BDT
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, _currency?: string): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Format currency with decimals (for precise amounts)
 */
export function formatCurrencyPrecise(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format currency for charts (compact format)
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 10000000) { // 1 crore
    return `${CURRENCY_SYMBOL}${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 100000) { // 1 lakh
    return `${CURRENCY_SYMBOL}${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `${CURRENCY_SYMBOL}${(amount / 1000).toFixed(0)}K`;
  }
  return `${CURRENCY_SYMBOL}${amount}`;
}

/**
 * Parse a currency string back to number
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[৳,\s]/g, '');
  return parseFloat(cleaned) || 0;
}
