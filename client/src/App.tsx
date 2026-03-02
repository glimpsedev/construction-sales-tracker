import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { isAuthenticated } from "./lib/auth";
import Dashboard from "@/pages/dashboard";
import Analytics from "@/pages/analytics";
import Equipment from "@/pages/equipment";
import { EmailSetupPage } from "@/pages/email-setup";
import { DodgeImportPage } from "@/pages/dodge-import";
import { ContactImportPage } from "@/pages/contact-import";
import { KycImportPage } from "@/pages/kyc-import";
import ContactsPage from "@/pages/contacts";
import CompaniesPage from "@/pages/companies";
import CrmPage from "@/pages/crm";
import DatabaseManagement from "@/pages/database-management";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Verify from "@/pages/verify";
import NotFound from "@/pages/not-found";

function Router() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
    setAuthChecked(true);
  }, []);

  if (!authChecked) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify" component={Verify} />
      {authenticated ? (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/equipment" component={Equipment} />
          <Route path="/email-setup" component={EmailSetupPage} />
          <Route path="/dodge-import" component={DodgeImportPage} />
          <Route path="/crm" component={CrmPage} />
          <Route path="/contacts" component={ContactsPage} />
          <Route path="/companies/:id" component={CompaniesPage} />
          <Route path="/companies" component={CompaniesPage} />
          <Route path="/contact-import" component={ContactImportPage} />
          <Route path="/kyc-import" component={KycImportPage} />
          <Route path="/database" component={DatabaseManagement} />
          <Route component={NotFound} />
        </>
      ) : (
        <Route>
          <Redirect to="/login" />
        </Route>
      )}
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
