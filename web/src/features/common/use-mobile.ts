import { useState, useEffect } from 'react';

/**
 * React hook to detect mobile viewport (< 768px by default).
 * Updates automatically on resize/orientation change.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    update();
    if (query.addEventListener) {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    } else {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
  }, [breakpoint]);

  return isMobile;
}
