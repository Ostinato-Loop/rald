import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Home } from "./pages/home";
import { LoopBusiness } from "./pages/loop-business";
import { PayRald } from "./pages/payrald";
import { LoopDispatch } from "./pages/loop-dispatch";
import { Raldtics } from "./pages/raldtics";
import { LoopVoice } from "./pages/loop-voice";
import { GitRald } from "./pages/gitrald";
import { Layout } from "./components/layout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/loop-business" component={LoopBusiness} />
      <Route path="/payrald" component={PayRald} />
      <Route path="/loop-dispatch" component={LoopDispatch} />
      <Route path="/raldtics" component={Raldtics} />
      <Route path="/loop-voice" component={LoopVoice} />
      <Route path="/gitrald" component={GitRald} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
