import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useGoals } from "@/hooks/use-goals";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import ExpensesPage from "@/pages/expenses";
import IncomesPage from "@/pages/incomes";
import OnboardingPage from "@/pages/onboarding";
import SettingsPage from "@/pages/settings";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import { Loader2 } from "lucide-react";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <Component {...rest} />;
}

function GoalGuardRoute({ component: Component, ...rest }: any) {
  const { user, isLoading: authLoading } = useAuth();
  const { goals, isLoading: goalsLoading } = useGoals({ enabled: !!user });

  if (authLoading || goalsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (!goals) {
    return <Redirect to="/onboarding" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route path="/onboarding">
        {() => <PrivateRoute component={OnboardingPage} />}
      </Route>
      <Route path="/settings">
        {() => <GoalGuardRoute component={SettingsPage} />}
      </Route>
      <Route path="/">
        {() => <GoalGuardRoute component={Dashboard} />}
      </Route>
      <Route path="/expenses">
        {() => <GoalGuardRoute component={ExpensesPage} />}
      </Route>
      <Route path="/incomes">
        {() => <GoalGuardRoute component={IncomesPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
