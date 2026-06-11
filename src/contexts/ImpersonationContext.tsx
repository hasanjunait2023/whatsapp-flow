import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ImpersonatedTenant {
  id: string;
  name: string;
}

interface ImpersonationContextType {
  impersonatedTenant: ImpersonatedTenant | null;
  isImpersonating: boolean;
  startImpersonation: (tenant: ImpersonatedTenant) => void;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const IMPERSONATION_KEY = 'admin_impersonation';

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedTenant, setImpersonatedTenant] = useState<ImpersonatedTenant | null>(() => {
    // Restore impersonation state from sessionStorage
    try {
      const stored = sessionStorage.getItem(IMPERSONATION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const startImpersonation = useCallback((tenant: ImpersonatedTenant) => {
    setImpersonatedTenant(tenant);
    sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(tenant));
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonatedTenant(null);
    sessionStorage.removeItem(IMPERSONATION_KEY);
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedTenant,
        isImpersonating: !!impersonatedTenant,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
