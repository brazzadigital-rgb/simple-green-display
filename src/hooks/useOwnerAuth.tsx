import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOwnerAuth() {
  const { user, session, isLoading: authLoading, signIn, signOut } = useAuth();

  const { data: isOwner, isLoading: roleLoading } = useQuery({
    queryKey: ["owner-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "owner");
      return (data && data.length > 0) || false;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  return {
    user,
    session,
    isOwner: !!isOwner,
    isLoading: authLoading || roleLoading,
    signIn,
    signOut,
  };
}
