import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Sparkles } from "lucide-react";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  banner_url: string | null;
}

interface OverrideCollection {
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

interface Props {
  overrideTitle?: string | null;
  overrideSubtitle?: string | null;
  overrideCollections?: OverrideCollection[];
}

export function MosaicCollections({ overrideTitle, overrideSubtitle, overrideCollections }: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (overrideCollections && overrideCollections.length > 0) {
      setCollections(overrideCollections.map((oc) => oc.collection));
      setLoading(false);
      return;
    }
    const fetch = async () => {
      const { data } = await supabase
        .from("collections")
        .select("id, name, slug, description, image_url, banner_url")
        .eq("is_active", true)
        .order("sort_order")
        .limit(6);
      setCollections((data as Collection[]) || []);
      setLoading(false);
    };
    fetch();
  }, [overrideCollections]);

  if (loading) {
    return (
      <section className="py-8 md:py-16 bg-background">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
            {[...Array(6)].map((_, i) => (
              <Skeleton
                key={i}
                className={`rounded-2xl ${i === 0 ? "col-span-2 row-span-2 h-[300px] md:h-[440px]" : "h-[200px] md:h-[210px]"}`}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (collections.length === 0) return null;

  return (
    <section className="py-10 md:py-20 bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 0.5px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="md:container relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-8 md:mb-14 px-4"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent font-sans text-[10px] font-bold uppercase tracking-[0.2em] mb-4"
          >
            <Sparkles className="w-3 h-3" />
            Explore
          </motion.span>

          <h2
            className="text-5xl md:text-6xl lg:text-7xl leading-tight capitalize"
            style={{ fontFamily: "'Tangerine', cursive", fontWeight: 700 }}
          >
            {(() => {
              const words = (overrideTitle || "Coleções em Destaque").toLowerCase().split(" ");
              const lastWord = words.pop();
              return (
                <>
                  <span className="text-foreground">{words.join(" ")} </span>
                  <span className="text-primary">{lastWord}</span>
                </>
              );
            })()}
          </h2>

          <div className="flex justify-center mt-3">
            <div className="w-12 h-[2px] rounded-full bg-accent/40" />
          </div>

          {overrideSubtitle && (
            <p className="text-sm md:text-base text-muted-foreground font-sans mt-3 max-w-md mx-auto leading-relaxed">
              {overrideSubtitle}
            </p>
          )}

          {/* Decorative line */}
          <div className="mt-5 flex justify-center">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          </div>
        </motion.div>

        {/* ── Desktop: CSS Grid Mosaic ── */}
        <div className="hidden md:grid grid-cols-3 gap-4 lg:gap-5 auto-rows-[210px]">
          {collections.slice(0, 6).map((c, i) => {
            const spanClass =
              i === 0
                ? "col-span-2 row-span-2"
                : i === 3
                ? "col-span-2"
                : "";

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  delay: i * 0.08,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={spanClass}
              >
                <Link
                  to={`/colecao/${c.slug}`}
                  className="group relative block w-full h-full rounded-[20px] overflow-hidden vitrine-glow"
                >
                  {/* Image */}
                  {(c.banner_url || c.image_url) ? (
                    <img
                      src={c.banner_url || c.image_url!}
                      alt={c.name}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50" />
                  )}

                  {/* Multi-layer overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                  
                  {/* Accent glow on hover — bottom edge */}
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 lg:p-7">
                    <div className="overflow-hidden">
                      <motion.h3
                        className="font-display text-xl md:text-2xl lg:text-[1.65rem] font-bold text-white uppercase leading-tight mb-2 translate-y-0 group-hover:-translate-y-0.5 transition-transform duration-500"
                      >
                        {c.name}
                      </motion.h3>
                    </div>

                    {/* CTA row */}
                    <div className="flex items-center gap-2 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                      <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-white/90">
                        Ver coleção
                      </span>
                      <div className="w-6 h-6 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center group-hover:bg-accent/80 transition-colors duration-300">
                        <ArrowRight className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Border glow on hover */}
                  <div className="absolute inset-0 rounded-2xl lg:rounded-[22px] ring-1 ring-white/0 group-hover:ring-white/15 transition-all duration-500 pointer-events-none" />

                  {/* Corner accent */}
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/0 group-hover:border-white/20 rounded-tr-lg transition-all duration-500 pointer-events-none" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* ── Mobile: uniform 2-column grid ── */}
        <div className="md:hidden grid grid-cols-2 gap-[3px]">
          {collections.slice(0, 6).map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
            >
              <Link
                to={`/colecao/${c.slug}`}
                className="group relative block w-full aspect-[3/4] overflow-hidden"
              >
                {(c.banner_url || c.image_url) ? (
                  <img
                    src={c.banner_url || c.image_url!}
                    alt={c.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-active:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50" />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3 pb-4">
                  <h3 className="font-display text-sm font-bold text-white uppercase leading-tight mb-1">
                    {c.name}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="font-sans text-[9px] font-semibold uppercase tracking-wider text-white/70">
                      Ver coleção
                    </span>
                    <ArrowRight className="w-2.5 h-2.5 text-white/60" />
                  </div>
                </div>

                {/* Subtle corner accent */}
                <div className="absolute top-2.5 right-2.5 w-5 h-5 border-t border-r border-white/15 rounded-tr-md pointer-events-none" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
