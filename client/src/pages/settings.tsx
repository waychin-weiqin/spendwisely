import { useEffect, useMemo, useState } from "react";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/hooks/use-user-settings";
import { GoalForm } from "@/components/goals/GoalForm";
import { useGoals } from "@/hooks/use-goals";
import { useAuth } from "@/hooks/use-auth";
import { BadgeCheck, Briefcase, GraduationCap, HeartHandshake, Loader2 } from "lucide-react";
import type { InsertGoal } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { DateTime } from "luxon";

const personas = [
  {
    id: "student",
    title: "Student",
    description: "Stretch every dollar while building good habits.",
    icon: GraduationCap,
    defaults: {
      mainGoal: "reduce_spending",
      successType: "max_spend",
      successAmount: 1200,
      priorityCategories: ["Food & Dining", "Transportation", "Education"],
      strictness: "balanced",
    },
  },
  {
    id: "early-career",
    title: "Early-career professional",
    description: "Balance lifestyle upgrades with steady savings.",
    icon: Briefcase,
    defaults: {
      mainGoal: "save_specific",
      successType: "max_spend",
      successAmount: 2800,
      priorityCategories: ["Bills & Utilities", "Food & Dining", "Travel"],
      strictness: "balanced",
    },
  },
  {
    id: "family",
    title: "Growing family",
    description: "Keep essentials covered and plan ahead.",
    icon: HeartHandshake,
    defaults: {
      mainGoal: "maintain",
      successType: "max_spend",
      successAmount: 5200,
      priorityCategories: ["Bills & Utilities", "Shopping", "Health & Fitness"],
      strictness: "flexible",
    },
  },
  {
    id: "goal-chaser",
    title: "Goal chaser",
    description: "Focused on big milestones and faster progress.",
    icon: BadgeCheck,
    defaults: {
      mainGoal: "save_specific",
      successType: "percent_income",
      successAmount: 20,
      priorityCategories: ["Bills & Utilities", "Food & Dining", "Other"],
      strictness: "strict",
    },
  },
] as const;

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { goals, isLoading, createGoals, isCreating, updateGoals, isUpdating } = useGoals({ enabled: !!user });
  const { settings, isLoading: settingsLoading, updateSettings, isUpdating: isUpdatingSettings } = useUserSettings();
  const [, setLocation] = useLocation();
  const [isSendingAllSummaries, setIsSendingAllSummaries] = useState(false);
  const [summarySendResult, setSummarySendResult] = useState<{
    message: string;
    sent: { username: string; email: string }[];
    skipped?: { username: string; email: string | null; reason: string }[];
  } | null>(null);
  const [summaryCountdown, setSummaryCountdown] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [appliedPersonaId, setAppliedPersonaId] = useState<string | null>(null);
  const [goalPreset, setGoalPreset] = useState<Partial<InsertGoal> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    const zone = "Australia/Melbourne";

    const updateCountdown = () => {
      const now = DateTime.now().setZone(zone);
      const firstOfThisMonth = now.startOf("month").plus({ minutes: 10 });
      const nextRun =
        now <= firstOfThisMonth
          ? firstOfThisMonth
          : now.plus({ months: 1 }).startOf("month").plus({ minutes: 10 });
      const diff = nextRun.diff(now, ["days", "hours", "minutes"]).toObject();
      const days = Math.max(0, Math.floor(diff.days ?? 0));
      const hours = Math.max(0, Math.floor(diff.hours ?? 0));
      const minutes = Math.max(0, Math.floor(diff.minutes ?? 0));
      setSummaryCountdown(`${days}d ${hours}h ${minutes}m until next summary`);
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedApplied = window.localStorage.getItem("spendwise:persona:applied");
    if (storedApplied) {
      setAppliedPersonaId(storedApplied);
      setSelectedPersonaId(storedApplied);
    }
  }, []);

  const selectedPersona = useMemo(
    () => personas.find((persona) => persona.id === selectedPersonaId) ?? null,
    [selectedPersonaId],
  );
  const mergedInitialValues = useMemo(
    () => (goalPreset ? { ...(goals ?? {}), ...goalPreset } : goals ?? undefined),
    [goals, goalPreset],
  );

  if (authLoading || isLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSubmit = (values: InsertGoal) => {
    if (goals) {
      updateGoals(values);
    } else {
      createGoals(values);
    }
  };

  const adminUiEnabled = import.meta.env.VITE_ENABLE_ADMIN_UI === "true";
  const adminToken = import.meta.env.VITE_ADMIN_TOKEN;
  const appVersion = import.meta.env.VITE_APP_VERSION || "dev";

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

  const sendAllSummaries = async () => {
    if (!adminToken) return;
    setIsSendingAllSummaries(true);
    setSummarySendResult(null);
    try {
      const response = await fetch("/api/admin/summary/send-all", {
        method: "POST",
        headers: { "x-admin-token": adminToken },
      });
      const data = await response.json();
      setSummarySendResult(data);
    } finally {
      setIsSendingAllSummaries(false);
    }
  };

  return (
    <div className="h-[100svh] md:min-h-screen md:h-auto box-border bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row safe-area-top overflow-hidden md:overflow-visible">
      <Sidebar />

      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-[calc(env(safe-area-inset-bottom)+120px)] md:pb-8 max-w-[1400px] mx-auto w-full animate-in min-h-0 overflow-y-auto md:overflow-visible">
        <header className="relative mb-10 overflow-hidden rounded-3xl border border-border/50 bg-white/80 px-6 py-7 shadow-xl shadow-black/5 backdrop-blur-sm md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_55%)]" />
          <div className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-slate-400/25 via-zinc-300/20 to-transparent blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground mt-1">
                Fine-tune goals, summaries, and preferences to match your lifestyle.
              </p>
            </div>
          </div>
        </header>

        <Card className="border-border/50 shadow-xl shadow-black/5 bg-card/90 backdrop-blur-sm mb-8 rounded-2xl">
          <CardHeader>
            <CardTitle>Spending goals</CardTitle>
            <CardDescription>Update the answers that shape your monthly insights.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-8 space-y-4 rounded-2xl border border-border/60 bg-white/80 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Profile</p>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedPersona ? selectedPersona.title : "Choose a persona"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPersona ? selectedPersona.description : "Apply a persona to prefill your goal settings."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={!selectedPersona}
                  onClick={() => {
                    setGoalPreset(selectedPersona?.defaults ?? null);
                    const appliedId = selectedPersona?.id ?? null;
                    setAppliedPersonaId(appliedId);
                    if (typeof window !== "undefined") {
                      if (appliedId) {
                        window.localStorage.setItem("spendwise:persona:applied", appliedId);
                      } else {
                        window.localStorage.removeItem("spendwise:persona:applied");
                      }
                    }
                  }}
                >
                  Apply persona defaults
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {personas.map((persona) => {
                  const Icon = persona.icon;
                  const isSelected = persona.id === selectedPersonaId;
                  const isApplied = persona.id === appliedPersonaId;
                  return (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => setSelectedPersonaId(persona.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                          : "border-border/60 bg-white/90 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/5",
                      )}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md shadow-black/20">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="block text-sm font-semibold text-foreground">{persona.title}</span>
                          {isApplied ? (
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                              Selected
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-xs text-muted-foreground">{persona.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <GoalForm
              initialValues={mergedInitialValues}
              onSubmit={handleSubmit}
              submitLabel="Save changes"
              isSubmitting={isUpdating || isCreating}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-xl shadow-black/5 bg-card/90 backdrop-blur-sm mb-8 rounded-2xl">
          <CardHeader>
            <CardTitle>Monthly AI summary</CardTitle>
            <CardDescription>
              Delivered on the 1st of each month at 00:10 (Australia/Melbourne).
            </CardDescription>
            {summaryCountdown ? (
              <p className="text-xs text-muted-foreground">
                {summaryCountdown}
              </p>
            ) : null}
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
          <Card className="border-border/50 shadow-xl shadow-black/5 bg-card/90 backdrop-blur-sm rounded-2xl">
            <CardHeader>
              <CardTitle>Admin tools (testing)</CardTitle>
              <CardDescription>Visible only when VITE_ENABLE_ADMIN_UI=true.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={triggerSummary}>
                Run summary now
              </Button>
              <Button variant="outline" onClick={sendTestEmail}>
                Send summary test email
              </Button>
              <Button
                variant="outline"
                onClick={sendAllSummaries}
                disabled={isSendingAllSummaries}
              >
                {isSendingAllSummaries ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending summaries
                  </>
                ) : (
                  "Send summaries to all users"
                )}
              </Button>
              </div>

              {summarySendResult ? (
                <div className="rounded-lg border border-border/50 bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p className="text-foreground text-xs font-medium">
                    {summarySendResult.message}
                  </p>
                  <p className="mt-1">
                    Sent {summarySendResult.sent.length} summaries.
                  </p>
                  {summarySendResult.sent.length ? (
                    <div className="mt-2 space-y-1">
                      {summarySendResult.sent.map((entry) => (
                        <p key={`${entry.email}-${entry.username}`}>
                          {entry.username} · {entry.email}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <p className="mt-8 text-xs text-muted-foreground/70">
          Version {appVersion}
        </p>
      </main>

      <MobileNav />
    </div>
  );
}
