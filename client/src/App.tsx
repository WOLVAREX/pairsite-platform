import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import RootGate from "@/pages/root-gate";
import Analytics from "@/pages/analytics";
import Admin from "@/pages/admin";
import Signup from "@/pages/signup";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Landing from "@/pages/landing";

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootGate} />
      <Route path="/landing" component={Landing} />
      <Route path="/analytics/:siteId" component={Analytics} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/admin" component={Admin} />
      <Route path="/signup" component={Signup} />
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
