import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { SportHeroSection } from "@/components/store/sections/SportHeroSection";
import { SportPromoPanels } from "@/components/store/sections/SportPromoPanels";
import { SportBenefitsSection } from "@/components/store/sections/SportBenefitsSection";
import { MotivationalBanner } from "@/components/store/sections/MotivationalBanner";
import { FeaturedProducts } from "@/components/store/sections/FeaturedProducts";
import { FeaturedCollections } from "@/components/store/sections/FeaturedCollections";
import { CategoriesSection } from "@/components/store/sections/CategoriesSection";
import { NewsletterSection } from "@/components/store/sections/NewsletterSection";
import { MosaicCollections } from "@/components/store/sections/MosaicCollections";
import { ShowcaseCountdown } from "@/components/store/sections/ShowcaseCountdown";
import { Skeleton } from "@/components/ui/skeleton";
import { useSellerReferral } from "@/hooks/useSellerReferral";
import { useHomeTemplate, type HomeTemplate } from "@/hooks/useHomeTemplate";
import { useActiveShowcase } from "@/hooks/useActiveShowcase";

interface HomeSection {
  id: string;
  section_type: string;
  title: string | null;
  config: any;
  sort_order: number;
}

const Index = () => {
  useSellerReferral();
  const { homeTemplate } = useHomeTemplate();
  const { showcase } = useActiveShowcase();
  const [searchParams] = useSearchParams();
  
  const previewTemplate = searchParams.get("preview_template") as HomeTemplate | null;
  const activeTemplate = previewTemplate || homeTemplate;

  const { data: sections = [], isLoading: loading } = useQuery({
    queryKey: ["home-sections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("home_sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return (data as HomeSection[]) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-[600px] w-full bg-muted" />
        <div className="container py-16">
          <Skeleton className="h-8 w-64 mx-auto mb-8 bg-muted" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-2xl bg-muted" />
                <Skeleton className="h-4 w-3/4 bg-muted" />
                <Skeleton className="h-4 w-1/2 bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default sport layout
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <SportHeroSection />

      {/* Promo Panels */}
      <SportPromoPanels />

      {/* Featured Products from DB sections */}
      {sections
        .filter((s) => s.section_type === "featured_products")
        .map((section) => (
          <FeaturedProducts key={section.id} config={section.config} title={section.title || undefined} />
        ))}

      {/* Benefits */}
      <SportBenefitsSection />

      {/* Motivational Banner */}
      <MotivationalBanner />

      {/* Categories */}
      <CategoriesSection />

      {/* Collections */}
      {sections
        .filter((s) => s.section_type === "featured_collections")
        .map((section) => (
          <FeaturedCollections key={section.id} config={section.config} title={section.title || undefined} />
        ))}

      {/* Newsletter */}
      {sections
        .filter((s) => s.section_type === "newsletter")
        .map((section) => (
          <NewsletterSection key={section.id} config={section.config} />
        ))}
    </main>
  );
};

export default Index;
