import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import VerifyEmail from "@/pages/verify-email";
import Sessions from "@/pages/sessions";
import Dashboard from "@/pages/dashboard";
import Services from "@/pages/services";
import Deployments from "@/pages/deployments";
import Credentials from "@/pages/credentials";
import Products from "@/pages/products";
import Health from "@/pages/health";
import { Shell } from "@/components/layout/shell";

const queryClient = new QueryClient();

const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const token = localStorage.getItem("rald_token");
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return originalFetch(url, options);
};

function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType; path: string }) {
  return (
    <Route {...rest}>
      <Shell>
        <Component />
      </Shell>
    </Route>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/services" component={Services} />
      <ProtectedRoute path="/deployments" component={Deployments} />
      <ProtectedRoute path="/credentials" component={Credentials} />
      <ProtectedRoute path="/products" component={Products} />
      <ProtectedRoute path="/sessions" component={Sessions} />
      <ProtectedRoute path="/health" component={Health} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
