import { useEffect, useState } from "react";

/**
 * True once the page has scrolled past `threshold` px. Uses a passive scroll
 * listener with rAF coalescing to avoid layout churn.
 */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > threshold);
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [threshold]);

  return scrolled;
}

/**
 * Scroll-spy: returns the id of the section currently in view, given a list of
 * section ids. Uses IntersectionObserver (no scroll-event churn).
 */
export function useScrollSpy(ids: string[], rootMargin = "-45% 0px -50% 0px"): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin, threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids, rootMargin]);

  return activeId;
}

/**
 * True once the referenced element has scrolled out of the top of the viewport.
 * Used to reveal the sticky mobile CTA only after the hero CTAs pass.
 */
export function usePassedElement(ref: React.RefObject<HTMLElement>): boolean {
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Passed when the element's bottom is above the viewport top.
        setPassed(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return passed;
}
