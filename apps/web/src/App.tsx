import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/contexts/TenantContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ColorSchemeProvider } from "@/contexts/ColorSchemeContext";
import { ErrorReportProvider, useErrorReporter } from "@/contexts/ErrorReportContext";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { CommandPalette } from "@/components/CommandPalette";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayoutWrapper from "@/components/layout/DashboardLayoutWrapper";
import AdminLayoutWrapper from "@/components/layout/AdminLayoutWrapper";
import RootRedirect from "@/components/routing/RootRedirect";
import { MotionProvider } from "@/lib/motion";
import { setRealtimeRecover } from "@/integrations/supabase/shim/realtime";

// Route-level code splitting: page modules load on demand instead of being
// pulled into the initial bundle.
const PublicLanding = lazy(() => import("@/pages/Landing"));
const MarketingPricing = lazy(() => import("@/pages/marketing/Pricing"));
const MarketingFeatures = lazy(() => import("@/pages/marketing/Features"));
const MarketingAbout = lazy(() => import("@/pages/marketing/About"));
const MarketingContact = lazy(() => import("@/pages/marketing/Contact"));
const MarketingBlog = lazy(() => import("@/pages/marketing/Blog"));
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const DataDeletion = lazy(() => import("./pages/legal/DataDeletion"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Instances = lazy(() => import("./pages/Instances"));
const InstanceOnboarding = lazy(() => import("./pages/InstanceOnboarding"));
const Inbox = lazy(() => import("./pages/Inbox"));
const FBInbox = lazy(() => import("./pages/FBInbox"));
const Team = lazy(() => import("./pages/Team"));
const Automation = lazy(() => import("./pages/Automation"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Billing = lazy(() => import("./pages/Billing"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Settings = lazy(() => import("./pages/Settings"));
const AiAgent = lazy(() => import("./pages/AiAgent"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const Workflows = lazy(() => import("./pages/Workflows"));
const Products = lazy(() => import("./pages/Products"));
const Orders = lazy(() => import("./pages/Orders"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Complaints = lazy(() => import("./pages/Complaints"));
const InternalChat = lazy(() => import("./pages/InternalChat"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Accounts = lazy(() => import("./pages/Accounts"));
const TeamReports = lazy(() => import("./pages/TeamReports"));
const Reports = lazy(() => import("./pages/Reports"));
const Groups = lazy(() => import("./pages/Groups"));
const Segmentation = lazy(() => import("./pages/Segmentation"));
const PendingActivation = lazy(() => import("./pages/PendingActivation"));
const PaymentSuccess = lazy(() => import("./pages/billing/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/billing/PaymentCancelled"));
const SetupWizard = lazy(() => import("./pages/SetupWizard"));
const WhatsAppFunctions = lazy(() => import("./pages/WhatsAppFunctions"));
const NumberHealth = lazy(() => import("./pages/NumberHealth"));
const Notifications = lazy(() => import("./pages/Notifications"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminTenants = lazy(() => import("./pages/admin/Tenants"));
const AdminPayments = lazy(() => import("./pages/admin/Payments"));
const AdminSubscriptions = lazy(() => import("./pages/admin/Subscriptions"));
const AdminPlans = lazy(() => import("./pages/admin/Plans"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminInstances = lazy(() => import("./pages/admin/Instances"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminAccounts = lazy(() => import("./pages/admin/Accounts"));
const AdminLeads = lazy(() => import("./pages/admin/Leads"));
const AdminManagement = lazy(() => import("./pages/admin/AdminManagement"));
const AdminExternalSales = lazy(() => import("./pages/admin/ExternalSales"));
const AdminCommunication = lazy(() => import("./pages/admin/Communication"));
const AdminSupport = lazy(() => import("./pages/admin/Support"));
const AdminTeam = lazy(() => import("./pages/admin/AdminTeam"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const AdminCampaignDetail = lazy(() => import("./pages/admin/AdminCampaignDetail"));
const AdminInbox = lazy(() => import("./pages/admin/AdminInbox"));
const ServiceBoards = lazy(() => import("./pages/service/Boards"));
const ServiceBoardPage = lazy(() => import("./pages/service/Board"));
const AdminServiceBoards = lazy(() => import("./pages/admin/AdminServiceBoards"));
const AdminServiceBoardPage = lazy(() => import("./pages/admin/AdminServiceBoardPage"));
const AdminInternalChat = lazy(() => import("./pages/admin/AdminInternalChat"));
const AdminWhatsAppFunctions = lazy(() => import("./pages/admin/AdminWhatsAppFunctions"));
const AdminWhatsAppInstances = lazy(() => import("./pages/admin/AdminWhatsAppInstances"));
const Channels = lazy(() => import("./pages/Channels"));

import { useEffect } from 'react';
import { toast } from 'sonner';

// Errors already surfaced elsewhere should not double-toast: 401 is handled by
// the http.ts choke-point (redirect to login); offline "Failed to fetch" noise
// is not actionable to the user.
function shouldSwallowQueryError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('Session expired') ||
    message.includes('401') ||
    message.includes('Failed to fetch') ||
    message.includes('Network error') ||
    message.includes('NetworkError') ||
    message.includes('Load failed')
  );
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (shouldSwallowQueryError(error)) return;
      const message = error instanceof Error ? error.message : 'Failed to load data';
      toast.error(message);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (shouldSwallowQueryError(error)) return;
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      toast.error(message);
    },
  }),
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

// On realtime (re)connect, refetch the active inbox/thread/contacts data so any
// change events missed while the connection was down are recovered. The shim's
// realtime transport calls this on every WS/SSE open and on wake/online events.
setRealtimeRecover(() => {
  queryClient.invalidateQueries({ queryKey: ['inbox'] });
  queryClient.invalidateQueries({ queryKey: ['sidebar-unread'] });
  queryClient.invalidateQueries({ queryKey: ['thread-messages'] });
  queryClient.invalidateQueries({ queryKey: ['contacts'] });
});

// Suspense fallback for lazily-loaded route modules. Reuses the same spinner
// idiom as ProtectedRoute so loading states feel consistent.
function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Global error handler component with error reporting
function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  const { reportError } = useErrorReporter();

  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || event.reason?.toString() || 'Unknown async error';
      reportError(errorMessage, { type: 'js', action: 'unhandled_rejection' });

      toast.error('An unexpected error occurred. Please try again.');
      event.preventDefault();
    };

    // Handle JavaScript runtime errors
    const handleGlobalError = (event: ErrorEvent) => {
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
                        <CommandPalette />
                        <Suspense fallback={<PageFallback />}>
                        <Routes>
                          {/* Public routes */}
                          <Route path="/" element={<RootRedirect />} />
                          {/* Direct public landing — always renders, no auth gating */}
                          <Route path="/home" element={<PublicLanding />} />
                          <Route path="/landing" element={<PublicLanding />} />
                          <Route path="/auth/login" element={<Login />} />
                          <Route path="/auth/signup" element={<Signup />} />
                          {/* GAP #4: /login alias — some links in the app use the bare path */}
                          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
                          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                          <Route path="/auth/reset-password" element={<ResetPassword />} />
                          <Route path="/invite/:token" element={<AcceptInvitation />} />

                          {/* Public legal/compliance pages — must render logged-out (Meta App Review) */}
                          <Route path="/privacy" element={<PrivacyPolicy />} />
                          <Route path="/terms" element={<TermsOfService />} />
                          <Route path="/data-deletion" element={<DataDeletion />} />
                          <Route path="/pricing" element={<MarketingPricing />} />
                          <Route path="/features" element={<MarketingFeatures />} />
                          <Route path="/about" element={<MarketingAbout />} />
                          <Route path="/contact" element={<MarketingContact />} />
                          <Route path="/blog" element={<MarketingBlog />} />

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
                            <Route path="/channels" element={<Channels />} />
                            <Route path="/instances" element={<Instances />} />
                            <Route path="/instances/onboarding" element={<InstanceOnboarding />} />
                            <Route path="/number-health" element={<NumberHealth />} />
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
                        </Suspense>
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
