import { useState, useEffect, useCallback } from 'react';

interface ElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export function useElementPosition(selector: string | null) {
  const [position, setPosition] = useState<ElementPosition | null>(null);
  const [element, setElement] = useState<Element | null>(null);

  const updatePosition = useCallback(() => {
    if (!selector) {
      setPosition(null);
      setElement(null);
      return;
    }

    const el = document.querySelector(selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setPosition({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      });
      setElement(el);
    } else {
      setPosition(null);
      setElement(null);
    }
  }, [selector]);

  useEffect(() => {
    updatePosition();

    // Update on scroll and resize
    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    // Observe DOM changes
    const observer = new MutationObserver(handleUpdate);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true 
    });

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      observer.disconnect();
    };
  }, [updatePosition]);

  return { position, element, updatePosition };
}
