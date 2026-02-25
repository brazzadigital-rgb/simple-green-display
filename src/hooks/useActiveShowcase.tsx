import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ShowcaseCollection {
  id: string;
  collection_id: string;
  sort_order: number;
  card_size: string;
  collection: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    banner_url: string | null;
  };
}

export interface ActiveShowcase {
  id: string;
  name: string;
  slug: string;
  section_title: string | null;
  section_subtitle: string | null;
  enable_countdown: boolean;
  enable_campaign_badge: boolean;
  badge_text: string | null;
  badge_color: string | null;
  badge_position: string | null;
  enable_promo_strip: boolean;
  promo_strip_text: string | null;
  banner_desktop_url: string | null;
  banner_mobile_url: string | null;
  banner_link: string | null;
  banner_overlay_opacity: number | null;
  banner_text_position: string | null;
  banner_clean_mode: boolean;
  starts_at: string;
  ends_at: string;
  priority: number;
  collections: ShowcaseCollection[];
}

export function useActiveShowcase() {
  const { data: showcase, isLoading } = useQuery({
    queryKey: ["active-showcase"],
    queryFn: async (): Promise<ActiveShowcase | null> => {
      const now = new Date().toISOString();

      // Get active showcases ordered by priority desc
      const { data: showcases } = await supabase
        .from("seasonal_showcases")
        .select("*")
        .in("status", ["active", "scheduled"])
        .lte("starts_at", now)
        .gte("ends_at", now)
        .order("priority", { ascending: false })
        .limit(1);

      if (!showcases || showcases.length === 0) return null;

      const active = showcases[0] as any;

      // Fetch collections for this showcase
      const { data: scData } = await supabase
        .from("showcase_collections")
        .select("id, collection_id, sort_order, card_size")
        .eq("showcase_id", active.id)
        .order("sort_order");

      if (!scData || scData.length === 0) return null;

      // Fetch collection details
      const collectionIds = scData.map((sc: any) => sc.collection_id);
      const { data: collections } = await supabase
        .from("collections")
        .select("id, name, slug, description, image_url, banner_url")
        .in("id", collectionIds);

      const collMap = new Map((collections || []).map((c: any) => [c.id, c]));

      const showcaseCollections: ShowcaseCollection[] = scData
        .map((sc: any) => ({
          ...sc,
          collection: collMap.get(sc.collection_id),
        }))
        .filter((sc: any) => sc.collection);

      return {
        ...active,
        collections: showcaseCollections,
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  return { showcase, isLoading };
}
