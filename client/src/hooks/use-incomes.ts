import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertIncome } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useIncomes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const incomesQuery = useQuery({
    queryKey: [api.incomes.list.path],
    queryFn: async () => {
      const res = await fetch(api.incomes.list.path);
      if (!res.ok) throw new Error("Failed to fetch incomes");
      return api.incomes.list.responses[200].parse(await res.json());
    },
  });

  const createIncomeMutation = useMutation({
    mutationFn: async (data: InsertIncome) => {
      const payload = {
        ...data,
        amount: Number(data.amount),
        date: new Date(data.date).toISOString(),
      };

      const res = await fetch(api.incomes.create.path, {
        method: api.incomes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Invalid input");
        }
        throw new Error("Failed to create income");
      }
      return api.incomes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.incomes.list.path] });
      toast({
        title: "Income added",
        description: "Your income has been successfully recorded.",
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

  const deleteIncomeMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.incomes.delete.path, { id });
      const res = await fetch(url, {
        method: api.incomes.delete.method,
      });
      if (!res.ok) throw new Error("Failed to delete income");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.incomes.list.path] });
      toast({
        title: "Income deleted",
        description: "The income entry has been removed.",
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

  const updateIncomeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertIncome }) => {
      const payload = {
        ...data,
        amount: Number(data.amount),
        date: new Date(data.date).toISOString(),
      };
      const url = buildUrl(api.incomes.update.path, { id });
      const res = await fetch(url, {
        method: api.incomes.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Invalid input");
        }
        throw new Error("Failed to update income");
      }
      return api.incomes.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.incomes.list.path] });
      toast({
        title: "Income updated",
        description: "Your income entry has been updated.",
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
    incomes: incomesQuery.data || [],
    isLoading: incomesQuery.isLoading,
    isError: incomesQuery.isError,
    createIncome: createIncomeMutation.mutate,
    isCreating: createIncomeMutation.isPending,
    deleteIncome: deleteIncomeMutation.mutate,
    isDeleting: deleteIncomeMutation.isPending,
    updateIncome: updateIncomeMutation.mutate,
    isUpdating: updateIncomeMutation.isPending,
  };
}
