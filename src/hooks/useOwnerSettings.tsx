import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type OwnerSetting = { id: string; key: string; value: string; updated_at: string };

export function useOwnerSettings() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["owner-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_settings")
        .select("*")
        .order("key");
      if (error) throw error;
      return (data || []) as OwnerSetting[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const getValue = (key: string) => settings?.find((s) => s.key === key)?.value || "";

  const upsert = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const existing = settings?.find((s) => s.key === key);
      if (existing) {
        const { error } = await supabase
          .from("owner_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("owner_settings")
          .insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["owner-settings"] }),
  });

  const saveMultiple = async (entries: { key: string; value: string }[]) => {
    try {
      for (const entry of entries) {
        await upsert.mutateAsync(entry);
      }
      toast({ title: "Configurações salvas", description: "Credenciais atualizadas com sucesso." });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  return { settings, isLoading, getValue, saveMultiple, upsert };
}
