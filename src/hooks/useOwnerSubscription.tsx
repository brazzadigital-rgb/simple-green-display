import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOwnerSubscription() {
  return useQuery({
    queryKey: ["owner-subscription"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_subscription" as any)
        .select("*, plan:plans(*)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useOwnerInvoices() {
  return useQuery({
    queryKey: ["owner-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_invoices" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useOwnerAuditLogs() {
  return useQuery({
    queryKey: ["owner-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as any[];
    },
    staleTime: 1000 * 60 * 2,
  });
}
