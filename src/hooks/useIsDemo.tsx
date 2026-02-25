import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { toast } from "@/hooks/use-toast";
import { useCallback } from "react";

/**
 * Hook that detects if the current logged-in user is the demo account.
 * Provides a guard function to block write operations in demo mode.
 */
export function useIsDemo() {
  const { user } = useAuth();
  const { getSetting } = useStoreSettings();

  const demoEnabled = getSetting("demo_enabled") === "true";
  const demoEmail = getSetting("demo_email");

  const isDemo = demoEnabled && !!demoEmail && user?.email === demoEmail;

  const blockIfDemo = useCallback((): boolean => {
    if (isDemo) {
      toast({
        title: "🔒 Modo Demo",
        description: "Alterações estão desativadas no modo demonstração.",
        variant: "destructive",
      });
      return true;
    }
    return false;
  }, [isDemo]);

  return { isDemo, blockIfDemo };
}
