import { createContext, useContext, ReactNode } from 'react';
import { useTenantState } from '@/hooks/useTenantState';

type TenantContextType = ReturnType<typeof useTenantState>;

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const tenantData = useTenantState();

  return (
    <TenantContext.Provider value={tenantData}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
}

