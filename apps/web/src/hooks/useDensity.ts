import { useState, useEffect, useCallback } from 'react';

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
  const [density, setDensityState] = useState<Density>(getStoredDensity);

  const setDensity = useCallback((d: Density) => {
    try {
      localStorage.setItem(STORAGE_KEY, d);
    } catch {
      /* ignore — storage may be blocked */
    }
    applyDensity(d);
    setDensityState(d);
  }, []);

  useEffect(() => {
    applyDensity(density);

    // Cross-tab sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const val = e.newValue as Density;
        applyDensity(val);
        setDensityState(val);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { density, setDensity };
}