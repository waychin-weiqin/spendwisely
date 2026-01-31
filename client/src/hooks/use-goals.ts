import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertGoal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useGoals(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const goalsQuery = useQuery({
    queryKey: [api.goals.get.path],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await fetch(api.goals.get.path);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch goals");
      return api.goals.get.responses[200].parse(await res.json());
    },
  });

  const createGoalsMutation = useMutation({
    mutationFn: async (payload: InsertGoal) => {
      const res = await fetch(api.goals.create.path, {
        method: api.goals.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Failed to create goals");
        }
        throw new Error("Failed to create goals");
      }
      return api.goals.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.goals.get.path], data);
      toast({
        title: "Goals saved",
        description: "Your preferences have been set.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to save goals",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateGoalsMutation = useMutation({
    mutationFn: async (payload: InsertGoal) => {
      const res = await fetch(api.goals.update.path, {
        method: api.goals.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Failed to update goals");
        }
        if (res.status === 404) {
          throw new Error("Goals not found");
        }
        throw new Error("Failed to update goals");
      }
      return api.goals.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.goals.get.path], data);
      toast({
        title: "Goals updated",
        description: "Your preferences have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to update goals",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    goals: goalsQuery.data,
    isLoading: goalsQuery.isLoading,
    isError: goalsQuery.isError,
    createGoals: createGoalsMutation.mutate,
    isCreating: createGoalsMutation.isPending,
    updateGoals: updateGoalsMutation.mutate,
    isUpdating: updateGoalsMutation.isPending,
  };
}
