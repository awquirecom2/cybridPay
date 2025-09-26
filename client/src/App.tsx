import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminProtectedRoute, MerchantProtectedRoute } from "@/components/protected-route";
import { LandingPage } from "@/components/landing-page";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { MerchantManagement } from "@/components/admin/merchant-management";
import { FeeConfiguration } from "@/components/admin/fee-configuration";
import { WebhookManagement } from "@/components/admin/webhook-management";
import { SignupLinkManagement } from "@/components/admin/signup-link-management";
import { PlatformSettings } from "@/components/admin/platform-settings";
import { UserManagement } from "@/components/admin/user-management";
import { MerchantDashboard } from "@/components/merchant/merchant-dashboard";
import { KybOnboarding } from "@/components/merchant/kyb-onboarding";
import { ManageIntegrations } from "@/components/merchant/manage-integrations";
import { ReceiveCrypto } from "@/components/merchant/receive-crypto";
import { OfframpCrypto } from "@/components/merchant/offramp-crypto";
import { Accounts } from "@/components/merchant/accounts";
import MerchantLogin from "@/pages/merchant-login";
import MerchantSignup from "@/pages/merchant-signup";
import AdminLogin from "@/pages/admin-login";
import AdminPasswordReset from "@/pages/admin-password-reset";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();
  
  // Determine user role based on current path
  const getUserRole = (path: string): "admin" | "merchant" | "customer" => {
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/merchant')) return 'merchant';
    return 'customer';
  };

  const userRole = getUserRole(location);
  const isPortalRoute = location.startsWith('/admin') || location.startsWith('/merchant');
  
  return (
    <Switch>
      {/* Landing Page */}
      <Route path="/" component={LandingPage} />
      
      {/* Authentication Routes */}
      <Route path="/merchant/login" component={MerchantLogin} />
      <Route path="/signup/:token" component={MerchantSignup} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/reset-password" component={AdminPasswordReset} />
      
      {/* Admin Portal Routes - Protected */}
      <Route path="/admin">
        <AdminProtectedRoute>
          <AdminDashboard />
        </AdminProtectedRoute>
      </Route>
      <Route path="/admin/merchants">
        <AdminProtectedRoute>
          <MerchantManagement />
        </AdminProtectedRoute>
      </Route>
      <Route path="/admin/permissions">
        <AdminProtectedRoute>
          <UserManagement />
        </AdminProtectedRoute>
      </Route>
      <Route path="/admin/fees">
        <AdminProtectedRoute>
          <FeeConfiguration />
        </AdminProtectedRoute>
      </Route>
      <Route path="/admin/webhooks">
        <AdminProtectedRoute>
          <WebhookManagement />
        </AdminProtectedRoute>
      </Route>
      <Route path="/admin/signup-links">
        <AdminProtectedRoute>
          <SignupLinkManagement />
        </AdminProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <AdminProtectedRoute>
          <PlatformSettings />
        </AdminProtectedRoute>
      </Route>
      
      {/* Merchant Portal Routes - Protected */}
      <Route path="/merchant">
        <MerchantProtectedRoute>
          <MerchantDashboard />
        </MerchantProtectedRoute>
      </Route>
      <Route path="/merchant/onboarding">
        <MerchantProtectedRoute>
          <KybOnboarding />
        </MerchantProtectedRoute>
      </Route>
      <Route path="/merchant/receive-crypto">
        <MerchantProtectedRoute>
          <ReceiveCrypto />
        </MerchantProtectedRoute>
      </Route>
      <Route path="/merchant/offramp-crypto">
        <MerchantProtectedRoute>
          <OfframpCrypto />
        </MerchantProtectedRoute>
      </Route>
      <Route path="/merchant/manage-integrations">
        <MerchantProtectedRoute>
          <ManageIntegrations />
        </MerchantProtectedRoute>
      </Route>
      <Route path="/merchant/accounts">
        <MerchantProtectedRoute>
          <Accounts />
        </MerchantProtectedRoute>
      </Route>
      
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const [location] = useLocation();
  const isLandingPage = location === '/';
  const isLoginRoute = location === '/admin/login' || location === '/merchant/login' || location === '/admin/reset-password';
  const isPortalRoute = (location.startsWith('/admin') || location.startsWith('/merchant')) && !isLoginRoute;
  
  // Determine user role based on current path
  const getUserRole = (path: string): "admin" | "merchant" | "customer" => {
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/merchant')) return 'merchant';
    return 'customer';
  };

  const userRole = getUserRole(location);

  // For landing page and login pages, render without sidebar
  if (isLandingPage || isLoginRoute) {
    return <Router />;
  }

  // For authenticated portal routes, render with sidebar
  if (isPortalRoute) {
    const style = {
      "--sidebar-width": "20rem",       // 320px for better content
      "--sidebar-width-icon": "4rem",   // default icon width
    };

    return (
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar userRole={userRole} />
          <div className="flex flex-col flex-1">
            <header className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto p-6">
              <Router />
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Fallback for other routes
  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="ruupay-theme">
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
