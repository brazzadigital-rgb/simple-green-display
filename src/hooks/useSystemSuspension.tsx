import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSystemSuspension() {
  const { data: isSuspended, isLoading } = useQuery({
    queryKey: ["system-suspended"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_system_suspended");
      if (error) return false;
      return data === true;
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });

  return { isSuspended: !!isSuspended, isLoading };
}
