import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SettingsMap {
  [key: string]: string;
}

const fetchSettings = async (): Promise<SettingsMap> => {
  const { data } = await supabase.from("store_settings").select("key, value");
  const map: SettingsMap = {};
  data?.forEach((s: any) => { map[s.key] = s.value; });
  return map;
};

export function useStoreSettings() {
  const { data: settings = {}, isLoading: loading } = useQuery({
    queryKey: ["store-settings"],
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });

  const getSetting = (key: string, fallback = "") => settings[key] ?? fallback;
  const isEnabled = (key: string) => settings[key] === "true";

  return { settings, loading, getSetting, isEnabled };
}
