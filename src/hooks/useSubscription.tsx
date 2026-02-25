import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Plan {
  id: string;
  name: string;
  highlight_badge: string | null;
  description: string | null;
  monthly_price: number;
  semiannual_price: number;
  annual_price: number;
  features_json: string[];
  is_active: boolean;
  sort_order: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  billing_cycle: "monthly" | "semiannual" | "annual";
  status: "trialing" | "active" | "past_due" | "canceled";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan?: Plan;
}

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as Plan[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plan:plans(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as (Subscription & { plan: Plan }) | null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}
