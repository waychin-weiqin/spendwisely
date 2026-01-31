import { useEffect } from "react";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/hooks/use-user-settings";
import { GoalForm } from "@/components/goals/GoalForm";
import { useGoals } from "@/hooks/use-goals";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import type { InsertGoal } from "@shared/schema";
import { useLocation } from "wouter";

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { goals, isLoading, updateGoals, isUpdating } = useGoals({ enabled: !!user });
  const { settings, isLoading: settingsLoading, updateSettings, isUpdating: isUpdatingSettings } = useUserSettings();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading || isLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = (values: InsertGoal) => {
    updateGoals(values);
  };

  const adminUiEnabled = import.meta.env.VITE_ENABLE_ADMIN_UI === "true";
  const adminToken = import.meta.env.VITE_ADMIN_TOKEN;

  const triggerSummary = async () => {
    if (!adminToken) return;
    await fetch("/api/admin/summary/run", {
      method: "POST",
      headers: { "x-admin-token": adminToken },
    });
  };

  const sendTestEmail = async () => {
    if (!adminToken || !settings?.email) return;
    await fetch("/api/admin/email/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({ to: settings.email }),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
      <Sidebar />

      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-[1400px] mx-auto w-full animate-in">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your goal preferences and AI summary settings.</p>
        </header>

        <Card className="border-border/50 shadow-sm mb-8">
          <CardHeader>
            <CardTitle>Spending goals</CardTitle>
            <CardDescription>Update the answers that shape your monthly insights.</CardDescription>
          </CardHeader>
          <CardContent>
            <GoalForm
              initialValues={goals ?? undefined}
              onSubmit={handleSubmit}
              submitLabel="Save changes"
              isSubmitting={isUpdating}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm mb-8">
          <CardHeader>
            <CardTitle>Monthly AI summary</CardTitle>
            <CardDescription>
              Delivered on the 1st of each month at 00:10 (Australia/Melbourne).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
              <div>
                <p className="font-medium text-sm text-foreground">Email summaries</p>
                <p className="text-xs text-muted-foreground">
                  Receive a monthly AI summary at {settings?.email}
                </p>
              </div>
              <Switch
                checked={settings?.summaryEnabled ?? true}
                onCheckedChange={(checked) => updateSettings({ summaryEnabled: checked })}
                disabled={isUpdatingSettings}
              />
            </div>
          </CardContent>
        </Card>

        {adminUiEnabled ? (
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Admin tools (testing)</CardTitle>
              <CardDescription>Visible only when VITE_ENABLE_ADMIN_UI=true.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={triggerSummary}>
                Run summary now
              </Button>
              <Button variant="outline" onClick={sendTestEmail}>
                Send summary test email
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </main>

      <MobileNav />
    </div>
  );
}
