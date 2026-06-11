import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enNav from './locales/en/nav.json';
import enOnboarding from './locales/en/onboarding.json';
import enDemo from './locales/en/demo.json';

// Bengali translations
import bnCommon from './locales/bn/common.json';
import bnAuth from './locales/bn/auth.json';
import bnDashboard from './locales/bn/dashboard.json';
import bnNav from './locales/bn/nav.json';
import bnOnboarding from './locales/bn/onboarding.json';
import bnDemo from './locales/bn/demo.json';

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
    nav: enNav,
    onboarding: enOnboarding,
    demo: enDemo,
  },
  bn: {
    common: bnCommon,
    auth: bnAuth,
    dashboard: bnDashboard,
    nav: bnNav,
    onboarding: bnOnboarding,
    demo: bnDemo,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'nav', 'onboarding', 'demo'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;

// Utility function for date formatting
export function formatDate(date: Date | string, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Utility function for currency formatting
export function formatCurrency(amount: number, locale: string, currency = 'BDT'): string {
  return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Utility function for number formatting
export function formatNumber(num: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-US').format(num);
}
