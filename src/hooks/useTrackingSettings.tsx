import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TrackingConfig {
  // Meta Pixel
  meta_pixel_enabled: boolean;
  meta_pixel_id: string;
  meta_pixel_access_token: string;
  meta_pixel_dedup: boolean;
  meta_pixel_advanced_matching: {
    email: boolean;
    phone: boolean;
    name: boolean;
    city_state_zip: boolean;
  };
  meta_pixel_events: {
    PageView: boolean;
    ViewContent: boolean;
    Search: boolean;
    AddToCart: boolean;
    InitiateCheckout: boolean;
    AddPaymentInfo: boolean;
    Purchase: boolean;
  };
  // GA4
  ga4_enabled: boolean;
  ga4_measurement_id: string;
  ga4_api_secret: string;
  ga4_enhanced_measurement: boolean;
  ga4_events: {
    page_view: boolean;
    view_item: boolean;
    view_item_list: boolean;
    select_item: boolean;
    add_to_cart: boolean;
    begin_checkout: boolean;
    add_payment_info: boolean;
    purchase: boolean;
  };
  // UTMify
  utmify_enabled: boolean;
  utmify_attribution_window: number;
  utmify_model: "first_click" | "last_click";
  utmify_use_localstorage: boolean;
  utmify_use_cookie: boolean;
  utmify_ignore_domains: string;
  utmify_normalize: boolean;
  // LGPD
  lgpd_enabled: boolean;
  lgpd_banner_text: string;
  lgpd_policy_link: string;
  lgpd_default_action: "reject" | "accept";
  lgpd_utm_category: "analytics" | "marketing";
  // Debug
  debug_mode: boolean;
}

const DEFAULT_CONFIG: TrackingConfig = {
  meta_pixel_enabled: false,
  meta_pixel_id: "",
  meta_pixel_access_token: "",
  meta_pixel_dedup: true,
  meta_pixel_advanced_matching: { email: false, phone: false, name: false, city_state_zip: false },
  meta_pixel_events: { PageView: true, ViewContent: true, Search: true, AddToCart: true, InitiateCheckout: true, AddPaymentInfo: false, Purchase: true },
  ga4_enabled: false,
  ga4_measurement_id: "",
  ga4_api_secret: "",
  ga4_enhanced_measurement: true,
  ga4_events: { page_view: true, view_item: true, view_item_list: true, select_item: true, add_to_cart: true, begin_checkout: true, add_payment_info: false, purchase: true },
  utmify_enabled: true,
  utmify_attribution_window: 30,
  utmify_model: "last_click",
  utmify_use_localstorage: true,
  utmify_use_cookie: true,
  utmify_ignore_domains: "",
  utmify_normalize: true,
  lgpd_enabled: true,
  lgpd_banner_text: "Usamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa Política de Privacidade.",
  lgpd_policy_link: "/politicas",
  lgpd_default_action: "reject",
  lgpd_utm_category: "analytics",
  debug_mode: false,
};

const TRACKING_SETTINGS_KEY = "tracking_config";

export function useTrackingSettings() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["tracking-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", TRACKING_SETTINGS_KEY)
        .maybeSingle();
      if (data?.value) {
        try {
          return { ...DEFAULT_CONFIG, ...JSON.parse(data.value) } as TrackingConfig;
        } catch { return DEFAULT_CONFIG; }
      }
      return DEFAULT_CONFIG;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newConfig: TrackingConfig) => {
      const { data: existing } = await supabase
        .from("store_settings")
        .select("id")
        .eq("key", TRACKING_SETTINGS_KEY)
        .maybeSingle();

      if (existing) {
        await supabase.from("store_settings").update({ value: JSON.stringify(newConfig) }).eq("key", TRACKING_SETTINGS_KEY);
      } else {
        await supabase.from("store_settings").insert({ key: TRACKING_SETTINGS_KEY, value: JSON.stringify(newConfig) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking-settings"] });
      toast({ title: "Configurações salvas!" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  return {
    config: config || DEFAULT_CONFIG,
    isLoading,
    saveConfig: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
