import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
const PublicLanding = lazy(() => import("@/pages/Landing"));
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/contexts/TenantContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ColorSchemeProvider } from "@/contexts/ColorSchemeContext";
import { ErrorReportProvider, useErrorReporter } from "@/contexts/ErrorReportContext";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayoutWrapper from "@/components/layout/DashboardLayoutWrapper";
import AdminLayoutWrapper from "@/components/layout/AdminLayoutWrapper";
import RootRedirect from "@/components/routing/RootRedirect";
import { MotionProvider } from "@/lib/motion";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Instances from "./pages/Instances";
import InstanceOnboarding from "./pages/InstanceOnboarding";
import Inbox from "./pages/Inbox";
import FBInbox from "./pages/FBInbox";
import Team from "./pages/Team";
import Automation from "./pages/Automation";
import Analytics from "./pages/Analytics";
import Billing from "./pages/Billing";
import Contacts from "./pages/Contacts";
import Settings from "./pages/Settings";
import AiAgent from "./pages/AiAgent";
import AcceptInvitation from "./pages/AcceptInvitation";
import Workflows from "./pages/Workflows";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Inventory from "./pages/Inventory";
import Complaints from "./pages/Complaints";
import InternalChat from "./pages/InternalChat";
import NotFound from "./pages/NotFound";
import Accounts from "./pages/Accounts";
import TeamReports from "./pages/TeamReports";
import Reports from "./pages/Reports";
import Groups from "./pages/Groups";
import Segmentation from "./pages/Segmentation";
import PendingActivation from "./pages/PendingActivation";
import PaymentSuccess from "./pages/billing/PaymentSuccess";
import PaymentCancelled from "./pages/billing/PaymentCancelled";
import SetupWizard from "./pages/SetupWizard";
import WhatsAppFunctions from "./pages/WhatsAppFunctions";
import Notifications from "./pages/Notifications";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminTenants from "./pages/admin/Tenants";
import AdminPayments from "./pages/admin/Payments";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminPlans from "./pages/admin/Plans";
import AdminUsers from "./pages/admin/Users";
import AdminInstances from "./pages/admin/Instances";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminSettings from "./pages/admin/Settings";
import AdminAccounts from "./pages/admin/Accounts";
import AdminLeads from "./pages/admin/Leads";
import AdminManagement from "./pages/admin/AdminManagement";
import AdminExternalSales from "./pages/admin/ExternalSales";
import AdminCommunication from "./pages/admin/Communication";
import AdminSupport from "./pages/admin/Support";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminReports from "./pages/admin/AdminReports";
import AdminMarketing from "./pages/admin/AdminMarketing";
import AdminCampaignDetail from "./pages/admin/AdminCampaignDetail";
import AdminInbox from "./pages/admin/AdminInbox";
import ServiceBoards from "./pages/service/Boards";
import ServiceBoardPage from "./pages/service/Board";
import AdminServiceBoards from "./pages/admin/AdminServiceBoards";
import AdminServiceBoardPage from "./pages/admin/AdminServiceBoardPage";
import AdminInternalChat from "./pages/admin/AdminInternalChat";
import AdminWhatsAppFunctions from "./pages/admin/AdminWhatsAppFunctions";
import AdminWhatsAppInstances from "./pages/admin/AdminWhatsAppInstances";

import { useEffect } from 'react';
import { toast } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes - data stays fresh
      gcTime: 1000 * 60 * 30,        // 30 minutes - cache retention
      refetchOnWindowFocus: false,   // Stop refetch on tab switch
      refetchOnMount: false,         // Use cached data when available
      retry: 1,                      // Single retry on failure
    },
  },
});

// Global error handler component with error reporting
function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  const { reportError } = useErrorReporter();

  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      const errorMessage = event.reason?.message || event.reason?.toString() || 'Unknown async error';
      reportError(errorMessage, { type: 'js', action: 'unhandled_rejection' });
      
      toast.error('An unexpected error occurred. Please try again.');
      event.preventDefault();
    };

    // Handle JavaScript runtime errors
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      
      const errorMessage = event.error?.message || event.message || 'Unknown error';
      reportError(errorMessage, { 
        type: 'js', 
        action: 'global_error',
        component: `${event.filename}:${event.lineno}:${event.colno}`
      });
      
      // Don't show toast for every JS error - can be too noisy
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, [reportError]);

  return <>{children}</>;
}

// Error boundary wrapper that uses the error reporter
function ErrorBoundaryWithReporter({ children }: { children: React.ReactNode }) {
  const { reportError } = useErrorReporter();
  
  return (
    <GlobalErrorBoundary reportError={reportError}>
      {children}
    </GlobalErrorBoundary>
  );
}

const App = () => (
  <ErrorReportProvider>
    <ErrorBoundaryWithReporter>
      <GlobalErrorHandler>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="light" storageKey="ecomex-theme" disableTransitionOnChange>
            <ColorSchemeProvider>
              <AuthProvider>
                <ImpersonationProvider>
                  <TenantProvider>
                    <TooltipProvider>
                      <MotionProvider>
                      <Toaster />
                      <Sonner />
                      <BrowserRouter>
                        <ImpersonationBanner />
                        <FloatingWhatsAppButton />
                        <Routes>
                          {/* Public routes */}
                          <Route path="/" element={<RootRedirect />} />
                          {/* Direct public landing — always renders, no auth gating */}
                          <Route path="/home" element={<Suspense fallback={<div className="min-h-screen bg-[#08080c]" />}><PublicLanding /></Suspense>} />
                          <Route path="/landing" element={<Suspense fallback={<div className="min-h-screen bg-[#08080c]" />}><PublicLanding /></Suspense>} />
                          <Route path="/auth/login" element={<Login />} />
                          <Route path="/auth/signup" element={<Signup />} />
                          <Route path="/invite/:token" element={<AcceptInvitation />} />
                          
                          {/* Special routes without DashboardLayout */}
                          <Route
                            path="/onboarding"
                            element={
                              <ProtectedRoute requireTenant={false} requireActivation={false}>
                                <Onboarding />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/pending-activation"
                            element={
                              <ProtectedRoute requireTenant={true} requireActivation={false}>
                                <PendingActivation />
                              </ProtectedRoute>
                            }
                          />
                          
                          {/* Payment callback routes - no auth required */}
                          <Route path="/billing/payment-success" element={<PaymentSuccess />} />
                          <Route path="/billing/payment-cancelled" element={<PaymentCancelled />} />

                          {/* Dashboard routes - all share DashboardLayout */}
                          <Route element={<DashboardLayoutWrapper />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/instances" element={<Instances />} />
                            <Route path="/instances/onboarding" element={<InstanceOnboarding />} />
                            <Route path="/inbox" element={<Inbox />} />
                            <Route path="/fb-inbox" element={<FBInbox />} />
                            <Route path="/team" element={<Team />} />
                            <Route path="/contacts" element={<Contacts />} />
                            <Route path="/automation" element={<Automation />} />
                            <Route path="/workflows" element={<Workflows />} />
                            <Route path="/products" element={<Products />} />
                            <Route path="/orders" element={<Orders />} />
                            <Route path="/inventory" element={<Inventory />} />
                            {/* Accounting consolidated onto /accounts (full P&L/cashflow). */}
                            <Route path="/accounting" element={<Navigate to="/accounts" replace />} />
                            <Route path="/complaints" element={<Complaints />} />
                            <Route path="/internal-chat" element={<InternalChat />} />
                            <Route path="/team-reports" element={<TeamReports />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/billing" element={<Billing />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/settings/:tab" element={<Settings />} />
                            <Route path="/ai-agent" element={<AiAgent />} />
                            <Route path="/accounts" element={<Accounts />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/groups" element={<Groups />} />
                            <Route path="/segmentation" element={<Segmentation />} />
                            <Route path="/setup" element={<SetupWizard />} />
                            <Route path="/notifications" element={<Notifications />} />
                            <Route path="/whatsapp-functions" element={<WhatsAppFunctions />} />
                            <Route path="/whatsapp-functions/:tab" element={<WhatsAppFunctions />} />
                            <Route path="/service/boards" element={<ServiceBoards />} />
                            <Route path="/service/boards/:boardId" element={<ServiceBoardPage />} />
                          </Route>

                          {/* Admin routes - all share AdminLayout */}
                          <Route element={<AdminLayoutWrapper />}>
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/admin/tenants" element={<AdminTenants />} />
                            <Route path="/admin/users" element={<AdminUsers />} />
                            <Route path="/admin/instances" element={<AdminInstances />} />
                            <Route path="/admin/accounts" element={<AdminAccounts />} />
                            <Route path="/admin/leads" element={<AdminLeads />} />
                            <Route path="/admin/marketing" element={<AdminMarketing />} />
                            <Route path="/admin/marketing/campaigns/:campaignId" element={<AdminCampaignDetail />} />
                            <Route path="/admin/payments" element={<AdminPayments />} />
                            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                            <Route path="/admin/plans" element={<AdminPlans />} />
                            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                            <Route path="/admin/settings" element={<AdminSettings />} />
                            <Route path="/admin/admin-management" element={<AdminManagement />} />
                            <Route path="/admin/external-sales" element={<AdminExternalSales />} />
                            <Route path="/admin/inbox" element={<AdminInbox />} />
                            <Route path="/admin/communication" element={<AdminCommunication />} />
                            <Route path="/admin/support" element={<AdminSupport />} />
                            <Route path="/admin/team" element={<AdminTeam />} />
                            <Route path="/admin/reports" element={<AdminReports />} />
                            <Route path="/admin/service-boards" element={<AdminServiceBoards />} />
                            <Route path="/admin/service-boards/:boardId" element={<AdminServiceBoardPage />} />
                            <Route path="/admin/team-chat" element={<AdminInternalChat />} />
                            <Route path="/admin/whatsapp-functions" element={<AdminWhatsAppFunctions />} />
                            <Route path="/admin/whatsapp-functions/:tab" element={<AdminWhatsAppFunctions />} />
                            <Route path="/admin/whatsapp-instances" element={<AdminWhatsAppInstances />} />
                          </Route>

                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </BrowserRouter>
                      </MotionProvider>
                    </TooltipProvider>
                  </TenantProvider>
                </ImpersonationProvider>
              </AuthProvider>
            </ColorSchemeProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </GlobalErrorHandler>
    </ErrorBoundaryWithReporter>
  </ErrorReportProvider>
);

export default App;
