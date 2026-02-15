import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertBudget } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useBudgets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const budgetsQuery = useQuery({
    queryKey: [api.budgets.list.path],
    queryFn: async () => {
      const res = await fetch(api.budgets.list.path);
      if (!res.ok) throw new Error("Failed to fetch budgets");
      return api.budgets.list.responses[200].parse(await res.json());
    },
  });

  const createBudgetMutation = useMutation({
    mutationFn: async (data: InsertBudget) => {
      const payload = {
        ...data,
        amount: Number(data.amount),
      };

      const res = await fetch(api.budgets.create.path, {
        method: api.budgets.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Invalid input");
        }
        throw new Error("Failed to create budget");
      }
      return api.budgets.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.budgets.list.path] });
      toast({
        title: "Budget created",
        description: "Your budget has been successfully set.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertBudget }) => {
      const payload = {
        ...data,
        amount: Number(data.amount),
      };

      const url = buildUrl(api.budgets.update.path, { id });
      const res = await fetch(url, {
        method: api.budgets.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Invalid input");
        }
        if (res.status === 404) {
          throw new Error("Budget not found");
        }
        throw new Error("Failed to update budget");
      }
      return api.budgets.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.budgets.list.path] });
      toast({
        title: "Budget updated",
        description: "Your budget has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.budgets.delete.path, { id });
      const res = await fetch(url, {
        method: api.budgets.delete.method,
      });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Budget not found");
        }
        throw new Error("Failed to delete budget");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.budgets.list.path] });
      toast({
        title: "Budget deleted",
        description: "The budget has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    budgets: budgetsQuery.data || [],
    isLoading: budgetsQuery.isLoading,
    isError: budgetsQuery.isError,
    createBudget: createBudgetMutation.mutate,
    isCreating: createBudgetMutation.isPending,
    updateBudget: updateBudgetMutation.mutate,
    isUpdating: updateBudgetMutation.isPending,
    deleteBudget: deleteBudgetMutation.mutate,
    isDeleting: deleteBudgetMutation.isPending,
  };
}
