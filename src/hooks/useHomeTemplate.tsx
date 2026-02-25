import { useStoreSettings } from "@/hooks/useStoreSettings";

export type HomeTemplate = "classic" | "mosaic_collections_v1";
export type HeaderStyle = "default" | "boutique_clean" | "vinho_premium" | "glass_luxury" | "editorial_minimal" | "compact_sticky";

export function useHomeTemplate() {
  const { getSetting, loading } = useStoreSettings();

  const homeTemplate = (getSetting("home_template", "classic") || "classic") as HomeTemplate;
  const headerStyle = (getSetting("header_style", "default") || "default") as HeaderStyle;

  return { homeTemplate, headerStyle, loading };
}
