import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalForm } from "@/components/goals/GoalForm";
import { useGoals } from "@/hooks/use-goals";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BadgeCheck, Briefcase, GraduationCap, HeartHandshake, Loader2, Sparkles } from "lucide-react";
import type { InsertGoal } from "@shared/schema";

const personas = [
  {
    id: "student",
    title: "Student",
    description: "Stretch every dollar while building good habits.",
    icon: GraduationCap,
    accents: ["Low cost living", "Budget discipline", "Smart savings"],
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
    accents: ["Grow savings", "Stay on track", "Spend mindfully"],
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
    accents: ["Home essentials", "Predictable bills", "Family goals"],
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
    accents: ["Aggressive saving", "Clear targets", "Monthly wins"],
    defaults: {
      mainGoal: "save_specific",
      successType: "percent_income",
      successAmount: 20,
      priorityCategories: ["Bills & Utilities", "Food & Dining", "Other"],
      strictness: "strict",
    },
  },
] as const;

export default function OnboardingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { goals, isLoading, createGoals, isCreating } = useGoals({ enabled: !!user });
  const [location, setLocation] = useLocation();
  const isRevisit = useMemo(() => {
    const search = location.split("?")[1] ?? "";
    return new URLSearchParams(search).get("revisit") === "1";
  }, [location]);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [showPersonaError, setShowPersonaError] = useState(false);

  const selectedPersona = useMemo(
    () => personas.find((persona) => persona.id === selectedPersonaId) ?? null,
    [selectedPersonaId],
  );

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    if (goals && !isRevisit) {
      setLocation("/settings");
    }
  }, [goals, isRevisit, setLocation]);

  const handleSubmit = (values: InsertGoal) => {
    createGoals(values, {
      onSuccess: () => setLocation("/"),
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-white/80 shadow-xl shadow-black/10 backdrop-blur-sm">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_55%)]" />
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-blue-400/30 via-emerald-300/20 to-transparent blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-400/20 via-cyan-300/20 to-transparent blur-3xl" />

          <div className="relative px-6 py-8 md:px-10 md:py-12">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Personalize your experience
                </div>
                <h1 className="mt-3 text-3xl font-display font-bold text-foreground">
                  Welcome to SpendWisely
                </h1>
                <p className="mt-2 text-sm text-muted-foreground md:text-base">
                  Tell us who you are so we can tailor goals, insights, and savings ideas just for you.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white/80">
                <span className={cn("h-2 w-2 rounded-full", step === 1 ? "bg-emerald-400" : "bg-white/30")} />
                Profile
                <span className="h-1 w-4 rounded-full bg-white/20" />
                <span className={cn("h-2 w-2 rounded-full", step === 2 ? "bg-emerald-400" : "bg-white/30")} />
                Goals
              </div>
            </div>

            {step === 1 ? (
              <div className="mt-10">
                <div className="grid gap-4 md:grid-cols-2">
                  {personas.map((persona) => {
                    const Icon = persona.icon;
                    const isSelected = persona.id === selectedPersonaId;
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => {
                          setSelectedPersonaId(persona.id);
                          setShowPersonaError(false);
                        }}
                        className={cn(
                          "group relative flex h-full flex-col gap-4 rounded-2xl border p-5 text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                            : "border-border/60 bg-white/90 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/5",
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md shadow-black/20">
                            <Icon className="h-6 w-6" />
                          </div>
                          {isSelected ? (
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                              Selected
                            </span>
                          ) : null}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{persona.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{persona.description}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {persona.accents.map((accent) => (
                            <span
                              key={accent}
                              className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
                            >
                              {accent}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {showPersonaError ? (
                  <p className="mt-4 text-sm text-rose-500">
                    Please pick a profile to continue.
                  </p>
                ) : null}

                <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    We use this only to pre-fill your goals. You can edit everything later.
                  </p>
                  <Button
                    size="lg"
                    onClick={() => {
                      if (!selectedPersona) {
                        setShowPersonaError(true);
                        return;
                      }
                      setStep(2);
                    }}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-10">
                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border/60 bg-white/90 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected profile</p>
                    <p className="text-lg font-semibold text-foreground">{selectedPersona?.title}</p>
                    <p className="text-sm text-muted-foreground">{selectedPersona?.description}</p>
                  </div>
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Change profile
                  </Button>
                </div>

                <Card className="border-border/50 shadow-xl shadow-black/5 bg-card/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl font-display">Set your spending goals</CardTitle>
                    <CardDescription>
                      Fine-tune the defaults so your monthly insights match your priorities.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <GoalForm
                      initialValues={selectedPersona?.defaults}
                      onSubmit={handleSubmit}
                      submitLabel="Save and continue"
                      isSubmitting={isCreating}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
