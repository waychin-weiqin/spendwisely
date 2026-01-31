import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalForm } from "@/components/goals/GoalForm";
import { useGoals } from "@/hooks/use-goals";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import type { InsertGoal } from "@shared/schema";

export default function OnboardingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { goals, isLoading, createGoals, isCreating } = useGoals({ enabled: !!user });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    if (goals) {
      setLocation("/settings");
    }
  }, [goals, setLocation]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl animate-in">
        <Card className="border-border/50 shadow-xl shadow-black/5 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-display">Set your spending goals</CardTitle>
            <CardDescription>
              Answer a few quick questions so we can tailor your monthly insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoalForm onSubmit={handleSubmit} submitLabel="Save and continue" isSubmitting={isCreating} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
