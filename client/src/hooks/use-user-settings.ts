import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useUserSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const settingsQuery = useQuery({
    queryKey: [api.userSettings.get.path],
    queryFn: async () => {
      const res = await fetch(api.userSettings.get.path);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return api.userSettings.get.responses[200].parse(await res.json());
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { summaryEnabled: boolean }) => {
      const res = await fetch(api.userSettings.update.path, {
        method: api.userSettings.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return api.userSettings.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.userSettings.get.path], data);
      toast({
        title: "Settings updated",
        description: "Your AI summary preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    isError: settingsQuery.isError,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
