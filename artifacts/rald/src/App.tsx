import {
  Switch,
  Route,
  Router as WouterRouter,
  Redirect,
  useLocation,
} from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth-context";

// Layouts
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DeveloperLayout } from "@/components/layout/DeveloperLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Auth pages
import Login from "@/pages/auth/Login";
import OAuthConsent from "@/pages/auth/OAuthConsent";

// Dashboard pages
import Overview from "@/pages/dashboard/Overview";
import Profile from "@/pages/dashboard/Profile";
import Security from "@/pages/dashboard/Security";
import Sessions from "@/pages/dashboard/Sessions";
import ApiKeys from "@/pages/dashboard/ApiKeys";
import Wallet from "@/pages/dashboard/Wallet";
import DashDevelopers from "@/pages/dashboard/Developers";
import Settings from "@/pages/dashboard/Settings";

// Developer portal
import DevOverview from "@/pages/developers/DevOverview";
import Apps from "@/pages/developers/Apps";
import DevApiKeys from "@/pages/developers/DevApiKeys";
import OAuthClients from "@/pages/developers/OAuthClients";
import Webhooks from "@/pages/developers/Webhooks";
import Logs from "@/pages/developers/Logs";
import Usage from "@/pages/developers/Usage";
import SDKs from "@/pages/developers/SDKs";
import Billing from "@/pages/developers/Billing";
import DevSettings from "@/pages/developers/DevSettings";

// Admin pages
import AdminOverview from "@/pages/admin/AdminOverview";
import LiveActivity from "@/pages/admin/LiveActivity";
import Users from "@/pages/admin/Users";
import AdminSessions from "@/pages/admin/AdminSessions";
import AdminSecurity from "@/pages/admin/AdminSecurity";
import OTPMonitor from "@/pages/admin/OTPMonitor";
import ApiTraffic from "@/pages/admin/ApiTraffic";
import Wallets from "@/pages/admin/Wallets";
import Disputes from "@/pages/admin/Disputes";
import AuditLogs from "@/pages/admin/AuditLogs";
import FeatureFlags from "@/pages/admin/FeatureFlags";
import AdminSettings from "@/pages/admin/AdminSettings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to={`/login?next=${encodeURIComponent(location)}`} />;
  }

  return <>{children}</>;
}

function AppRouter() {
  return (
    <Switch>
      {/* Auth routes */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Login} />
      <Route path="/auth" component={Login} />
      <Route path="/continue" component={Login} />
      <Route path="/oauth/authorize" component={OAuthConsent} />
      <Route path="/oauth/consent" component={OAuthConsent} />
      <Route path="/oauth/success" component={OAuthConsent} />
      <Route path="/oauth/denied" component={OAuthConsent} />

      {/* Dashboard routes */}
      <Route path="/dashboard">
        {() => (
          <ProtectedRoute>
            <DashboardLayout>
              <Overview />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/profile">
        {() => (
          <ProtectedRoute>
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/security">
        {() => (
          <ProtectedRoute>
            <DashboardLayout>
              <Security />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/sessions">
        {() => (
          <ProtectedRoute>
            <DashboardLayout>
              <Sessions />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/api-keys">
        {() => (
          <ProtectedRoute>
            <DashboardLayout>
              <ApiKeys />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/wallet">
        {() => (
          <ProtectedRoute>
            <DashboardLayout>
              <Wallet />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/developers">
        {() => (
          <ProtectedRoute>
            <DashboardLayout>
              <DashDevelopers />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/dashboard/settings">
        {() => (
          <ProtectedRoute>
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>

      {/* Developer portal routes */}
      <Route path="/developers">
        {() => (
          <ProtectedRoute>
            <DeveloperLayout>
              <DevOverview />
            </DeveloperLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/developers/apps">
        {() => (
          <ProtectedRoute>
            <DeveloperLayout>
              <Apps />
            </DeveloperLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/developers/api-keys">
        {() => (
          <ProtectedRoute>
            <DeveloperLayout>
              <DevApiKeys />
            </DeveloperLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/developers/oauth">
        {() => (
          <ProtectedRoute>
            <DeveloperLayout>
              <OAuthClients />
            </DeveloperLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/developers/webhooks">
        {() => (
          <ProtectedRoute>
            <DeveloperLayout>
              <Webhooks />
            </DeveloperLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/developers/logs">
        {() => (
          <ProtectedRoute>
            <DeveloperLayout>
              <Logs />
            </DeveloperLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/developers/usage">
        {() => (
          <ProtectedRoute>
            <DeveloperLayout>
              <Usage />
            </DeveloperLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/developers/sdks">
        {() => (
          <ProtectedRoute>
            <DeveloperLayout>
              <SDKs />
            </DeveloperLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/developers/billing">
        {() => (
          <ProtectedRoute>
            <DeveloperLayout>
              <Billing />
            </DeveloperLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/developers/settings">
        {() => (
          <ProtectedRoute>
            <DeveloperLayout>
              <DevSettings />
            </DeveloperLayout>
          </ProtectedRoute>
        )}
      </Route>

      {/* Admin routes */}
      <Route path="/admin">
        {() => (
          <ProtectedRoute>
            <AdminLayout>
              <AdminOverview />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/activity">
        {() => (
          <ProtectedRoute>
            <AdminLayout>
              <LiveActivity />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/users">
        {() => (
          <ProtectedRoute>
            <AdminLayout>
              <Users />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/sessions">
        {() => (
          <ProtectedRoute>
            <AdminLayout>
              <AdminSessions />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/security">
        {() => (
          <ProtectedRoute>
            <AdminLayout>
              <AdminSecurity />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/otp">
        {() => (
          <ProtectedRoute>
            <AdminLayout>
              <OTPMonitor />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/api-traffic">
        {() => (
          <ProtectedRoute>
            <AdminLayout>
              <ApiTraffic />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/wallets">
        {() => (
          <ProtectedRoute>
            <AdminLayout>
              <Wallets />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/disputes">
        {() => (
          <ProtectedRoute>
            <AdminLayout>
              <Disputes />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/audit">
        {() => (
          <ProtectedRoute>
            <AdminLayout>
              <AuditLogs />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/feature-flags">
        {() => (
          <ProtectedRoute>
            <AdminLayout>
              <FeatureFlags />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/settings">
        {() => (
          <ProtectedRoute>
            <AdminLayout>
              <AdminSettings />
            </AdminLayout>
          </ProtectedRoute>
        )}
      </Route>

      {/* Root redirect */}
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      <Route>
        <Redirect to="/login" />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="rald-theme">
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
