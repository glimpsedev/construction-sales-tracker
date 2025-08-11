import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Equipment from "@/pages/equipment";
import { EmailSetupPage } from "@/pages/email-setup";
import { DodgeImportPage } from "@/pages/dodge-import";
import DatabaseManagement from "@/pages/database-management";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/equipment" component={Equipment} />
      <Route path="/email-setup" component={EmailSetupPage} />
      <Route path="/dodge-import" component={DodgeImportPage} />
      <Route path="/database" component={DatabaseManagement} />
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
