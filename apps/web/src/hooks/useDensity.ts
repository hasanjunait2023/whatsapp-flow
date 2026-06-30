import { useEffect, useCallback } from 'react';

type Density = 'compact' | 'default' | 'spacious';
const STORAGE_KEY = 'ecomex-density';

function getStoredDensity(): Density {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'compact' || stored === 'default' || stored === 'spacious') {
      return stored;
    }
  } catch {
    // localStorage blocked (incognito, etc.) — fall through to default.
  }
  return 'default';
}

function applyDensity(density: Density): void {
  document.documentElement.setAttribute('data-density', density);
}

/**
 * Persists density choice (compact / default / spacious) to localStorage and
 * applies it as `data-density` on <html>. The CSS in `styles/theme.css` reads
 * this attribute to swap font-size + spacing scale.
 *
 * Usage:
 *   const { density, setDensity } = useDensity();
 *   <Button onClick={() => setDensity('compact')}>Compact</Button>
 */
export function useDensity() {
  const apply = useCallback((d: Density) => {
    try {
      localStorage.setItem(STORAGE_KEY, d);
    } catch {
      /* ignore — storage may be blocked */
    }
    applyDensity(d);
  }, []);

  useEffect(() => {
    // Re-apply on mount to handle SPA navigation + multi-tab sync.
    applyDensity(getStoredDensity());

    // Cross-tab sync — listen for storage events.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        applyDensity(e.newValue as Density);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return {
    density: getStoredDensity(),
    setDensity: apply,
  };
}