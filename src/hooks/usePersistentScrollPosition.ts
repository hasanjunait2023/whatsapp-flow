import { type DependencyList, type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Persist + restore scrollTop for a scroll container.
 * Useful when navigation/rerenders cause scroll containers to jump back to top.
 */
export function usePersistentScrollPosition<T extends HTMLElement>(
  storageKey: string,
  deps: DependencyList = []
): RefObject<T> {
  const ref = useRef<T>(null);

  // Restore before paint (prevents visible jump)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return;
    const value = Number(raw);
    if (Number.isFinite(value)) el.scrollTop = value;
  }, deps);

  // Persist on scroll (throttled with rAF)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        sessionStorage.setItem(storageKey, String(el.scrollTop));
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
    };
  }, deps);

  return ref;
}
