// Customer Status Badge Configuration
// Business-specific labels with English and Bengali translations

export type CustomerStatusKey = 
  // Wholesale
  | 'dealer' | 'regular_buyer' | 'buyer' | 'inactive_wholesale'
  // Retail
  | 'vip' | 'loyal' | 'repeat' | 'customer' | 'churned'
  // Service
  | 'subscriber' | 'trial' | 'past_due' | 'frozen' | 'cancelled'
  // Admin (Tenant status)
  | 'active' | 'trial_tenant' | 'past_due_tenant' | 'suspended' | 'churned_tenant' | 'free';

export type StatusColor = 'purple' | 'blue' | 'green' | 'amber' | 'orange' | 'red' | 'gray';

export interface CustomerStatusLabel {
  key: CustomerStatusKey;
  en: string;
  bn: string;
  color: StatusColor;
}

export interface CustomerData {
  totalOrders: number;
  totalSpent: number;
  scoreTier?: string | null;
  daysSinceLastOrder?: number | null;
  subscriptionStatus?: string | null;
}

// Color class mappings for badges
export const statusColorClasses: Record<StatusColor, string> = {
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
};

// Wholesale business labels
export function getWholesaleStatus(data: CustomerData): CustomerStatusLabel | null {
  // Only show labels for customers with orders
  if (data.totalOrders === 0) return null;

  // Check for inactive first (last order > 90 days)
  if (data.daysSinceLastOrder && data.daysSinceLastOrder > 90) {
    return { key: 'inactive_wholesale', en: 'Inactive', bn: 'নিষ্ক্রিয়', color: 'amber' };
  }

  // Dealer: 10+ orders OR 5 lakh+ spent
  if (data.totalOrders >= 10 || data.totalSpent >= 500000) {
    return { key: 'dealer', en: 'Dealer', bn: 'ডিলার', color: 'purple' };
  }

  // Regular Buyer: 3+ orders
  if (data.totalOrders >= 3) {
    return { key: 'regular_buyer', en: 'Regular Buyer', bn: 'নিয়মিত ক্রেতা', color: 'blue' };
  }

  // Buyer: 1+ orders
  return { key: 'buyer', en: 'Buyer', bn: 'ক্রেতা', color: 'green' };
}

// Retail E-commerce labels
export function getRetailStatus(data: CustomerData): CustomerStatusLabel | null {
  // Only show labels for customers with orders
  if (data.totalOrders === 0) return null;

  // VIP: Score tier VIP or 20+ orders
  if (data.scoreTier === 'vip' || data.totalOrders >= 20) {
    return { key: 'vip', en: 'VIP', bn: 'ভিআইপি', color: 'amber' };
  }

  // Churned: Has orders but last order > 60 days ago
  if (data.daysSinceLastOrder && data.daysSinceLastOrder > 60) {
    return { key: 'churned', en: 'Churned', bn: 'চার্নড', color: 'red' };
  }

  // Loyal: Gold/Platinum tier or 5+ orders
  if (['gold', 'platinum'].includes(data.scoreTier || '') || data.totalOrders >= 5) {
    return { key: 'loyal', en: 'Loyal', bn: 'লয়াল', color: 'purple' };
  }

  // Repeat: 2+ orders
  if (data.totalOrders >= 2) {
    return { key: 'repeat', en: 'Repeat', bn: 'রিপিট', color: 'blue' };
  }

  // Customer: exactly 1 order
  return { key: 'customer', en: 'Customer', bn: 'কাস্টমার', color: 'green' };
}

// Service business labels (subscription-based)
export function getServiceStatus(data: CustomerData): CustomerStatusLabel | null {
  // Only show labels for contacts with subscription
  if (!data.subscriptionStatus) return null;

  switch (data.subscriptionStatus) {
    case 'active':
      return { key: 'subscriber', en: 'Subscriber', bn: 'সাবস্ক্রাইবার', color: 'green' };
    case 'trialing':
      return { key: 'trial', en: 'Trial', bn: 'ট্রায়াল', color: 'blue' };
    case 'past_due':
      return { key: 'past_due', en: 'Past Due', bn: 'বাকি', color: 'amber' };
    case 'suspended':
      return { key: 'frozen', en: 'Frozen', bn: 'ফ্রোজেন', color: 'orange' };
    case 'cancelled':
      return { key: 'cancelled', en: 'Cancelled', bn: 'বাতিল', color: 'red' };
    default:
      return null;
  }
}

// Admin panel tenant status labels
export function getTenantStatusLabel(subscriptionStatus: string | null): CustomerStatusLabel | null {
  switch (subscriptionStatus) {
    case 'active':
      return { key: 'active', en: 'Active', bn: 'অ্যাক্টিভ', color: 'green' };
    case 'trialing':
      return { key: 'trial_tenant', en: 'Trial', bn: 'ট্রায়াল', color: 'blue' };
    case 'past_due':
      return { key: 'past_due_tenant', en: 'Past Due', bn: 'বাকি', color: 'amber' };
    case 'suspended':
      return { key: 'suspended', en: 'Suspended', bn: 'স্থগিত', color: 'orange' };
    case 'cancelled':
      return { key: 'churned_tenant', en: 'Churned', bn: 'চার্নড', color: 'red' };
    default:
      return { key: 'free', en: 'Free', bn: 'ফ্রি', color: 'gray' };
  }
}

// Main function to get customer status based on business type
export function getCustomerStatusLabel(
  businessType: string | null | undefined,
  data: CustomerData
): CustomerStatusLabel | null {
  if (!businessType) return null;

  // Normalize business type slug
  const normalizedType = businessType.toLowerCase().replace(/[-_\s]/g, '');

  // Wholesale variants
  if (normalizedType.includes('wholesale') || normalizedType.includes('paikari')) {
    return getWholesaleStatus(data);
  }

  // Service variants
  if (normalizedType.includes('service') || normalizedType.includes('সেবা')) {
    return getServiceStatus(data);
  }

  // Retail/E-commerce (default for most business types)
  return getRetailStatus(data);
}
