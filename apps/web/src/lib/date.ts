import { format, isValid } from 'date-fns';

/**
 * Format a date value that may be null/undefined/invalid.
 *
 * date-fns `format` throws `RangeError: Invalid time value` on an invalid Date.
 * Inside a React render that escalates to the Error Boundary and blanks the whole
 * page (this is what crashed /billing when a subscription/event date was null).
 * This guards the value and returns `fallback` instead of throwing.
 */
export function safeFormatDate(
  value: string | number | Date | null | undefined,
  fmt: string,
  fallback = '—',
): string {
  if (value == null) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  return isValid(d) ? format(d, fmt) : fallback;
}
