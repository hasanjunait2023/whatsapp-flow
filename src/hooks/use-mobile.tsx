import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const onChange = () => {
      const width = window.innerWidth;
      setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT);
    };
    
    const mqlMobile = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);
    const mqlDesktop = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
    
    mqlMobile.addEventListener("change", onChange);
    mqlDesktop.addEventListener("change", onChange);
    onChange();
    
    return () => {
      mqlMobile.removeEventListener("change", onChange);
      mqlDesktop.removeEventListener("change", onChange);
    };
  }, []);

  return !!isTablet;
}
