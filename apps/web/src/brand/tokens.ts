/**
 * Ecomex Brand Tokens
 * Source: official brand kit (2026-07-01)
 * Primary: violet, masking style: ribbon-fold 3D
 */

export const brandColors = {
  // Primary palette
  violet: {
    50:  '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',  // ★ PRIMARY
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#1e1b4b',  // Deep navy-violet
  },

  // Neutral
  ink: '#0f0a2e',
  ink2: '#1e1b4b',
  paper: '#fafafe',
  glass: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(167,139,250,0.18)',

  // Semantic
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
} as const;

export const brandMotion = {
  // Timing curves
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  easeBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  // Durations
  instant: '120ms',
  fast: '200ms',
  base: '320ms',
  slow: '600ms',
  hero: '900ms',

  // Stagger delays
  stagger01: '60ms',
  stagger02: '120ms',
  stagger03: '180ms',
  stagger04: '240ms',
  stagger05: '300ms',
} as const;

export const brandGradient = {
  // Used in CTAs, hero panels, accents
  violetFlow: `linear-gradient(135deg, ${brandColors.violet[400]} 0%, ${brandColors.violet[600]} 50%, ${brandColors.violet[800]} 100%)`,
  violetShine: `linear-gradient(135deg, ${brandColors.violet[300]} 0%, ${brandColors.violet[500]} 100%)`,
  violetDeep: `linear-gradient(180deg, ${brandColors.violet[950]} 0%, ${brandColors.violet[800]} 100%)`,
  wordmarkFlow: `linear-gradient(90deg, ${brandColors.violet[950]} 0%, ${brandColors.violet[800]} 100%)`,
} as const;
