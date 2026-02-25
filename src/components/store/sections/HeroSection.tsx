import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { DynamicHeroBanner } from "@/components/store/DynamicHeroBanner";
import { Skeleton } from "@/components/ui/skeleton";

interface HeroSectionProps {
  config: {
    layout?: string;
    title?: string;
    subtitle?: string;
    cta_text?: string;
    cta_link?: string;
    image_url?: string;
  };
  /** When set, renders this banner directly instead of the DynamicHeroBanner carousel */
  overrideBanner?: {
    desktop_image_url: string;
    mobile_image_url?: string;
    link?: string;
    show_text?: boolean;
    overlay_opacity?: number;
    content_position?: string;
  } | null;
}

export function HeroSection({ config, overrideBanner }: HeroSectionProps) {
  const { data: hasDynamicBanners, isLoading: checkingBanners } = useQuery({
    queryKey: ["hero-banners-check"],
    queryFn: async () => {
      const { count } = await supabase.from("banners").select("id", { count: "exact", head: true }).eq("location", "hero").eq("is_active", true);
      return (count || 0) > 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  // If showcase provides an override banner, render it directly
  if (overrideBanner) {
    const desktopImg = overrideBanner.desktop_image_url;
    const mobileImg = overrideBanner.mobile_image_url || desktopImg;
    const opacity = (overrideBanner.overlay_opacity ?? 0) / 100;

    return (
      <section className="bg-background md:py-6 lg:py-10">
        <div className="md:container md:px-6">
          <div className="md:rounded-2xl overflow-hidden">
            {overrideBanner.link ? (
              <Link to={overrideBanner.link} className="relative block w-full">
                <picture>
                  <source media="(max-width: 767px)" srcSet={mobileImg} />
                  <img src={desktopImg} alt="" className="w-full h-auto block" />
                </picture>
                {opacity > 0 && (
                  <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${opacity})` }} />
                )}
              </Link>
            ) : (
              <div className="relative w-full">
                <picture>
                  <source media="(max-width: 767px)" srcSet={mobileImg} />
                  <img src={desktopImg} alt="" className="w-full h-auto block" />
                </picture>
                {opacity > 0 && (
                  <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${opacity})` }} />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Show skeleton while checking for banners — never show stale fallback
  if (checkingBanners || hasDynamicBanners === undefined) {
    return (
      <section className="bg-background md:py-6 lg:py-10">
        <div className="md:container md:px-6">
          <Skeleton className="w-full h-[280px] md:h-[480px] lg:h-[540px] md:rounded-2xl" />
        </div>
      </section>
    );
  }

  // If dynamic banners exist, show them
  if (hasDynamicBanners) {
    return (
      <section className="bg-background md:py-6 lg:py-10">
        <div className="md:container md:px-6">
          <div className="md:rounded-2xl overflow-hidden">
            <DynamicHeroBanner />
          </div>
        </div>
      </section>
    );
  }

  // No dynamic banners → show static config-based fallback (no old image imports)
  const {
    title = "Nova coleção disponível",
    subtitle = "Qualidade e confiança em cada compra.",
    cta_text = "CONFERIR",
    cta_link = "/colecoes",
  } = config;

  // Only use image_url from config, no hardcoded fallback
  const bannerImage = config.image_url || "";

  if (!bannerImage) {
    // No image at all — show a gradient placeholder
    return (
      <section className="bg-background md:py-6 lg:py-10">
        <div className="md:container md:px-6">
          <div className="relative w-full md:rounded-2xl overflow-hidden min-h-[280px] md:min-h-[480px] lg:min-h-[540px] bg-gradient-to-br from-muted to-muted/60 flex items-end">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative z-10 p-5 sm:p-8 md:p-12 lg:p-16 max-w-lg"
            >
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-foreground mb-3">
                {title}
              </h2>
              <p className="text-sm md:text-base text-muted-foreground font-sans mb-6 leading-relaxed">
                {subtitle}
              </p>
              <Link to={cta_link}>
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full shine font-sans h-12 px-10 text-sm font-bold uppercase tracking-[0.15em]">
                  {cta_text} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background md:py-6 lg:py-10">
      <div className="md:container md:px-6">
        <div className="relative w-full md:rounded-2xl overflow-hidden md:flex items-end min-h-[280px] md:min-h-[480px] lg:min-h-[540px]"
          style={{ backgroundImage: `url(${bannerImage})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "hsl(var(--muted))" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 p-5 sm:p-8 md:p-12 lg:p-16 max-w-lg">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-white mb-3">{title}</h2>
            <p className="text-sm md:text-base text-white/70 font-sans mb-6 leading-relaxed">{subtitle}</p>
            <Link to={cta_link}>
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full shine font-sans h-12 px-10 text-sm font-bold uppercase tracking-[0.15em]">
                {cta_text} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
