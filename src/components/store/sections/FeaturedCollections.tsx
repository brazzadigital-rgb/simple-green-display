import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

interface FeaturedCollectionsProps {
  config: { limit?: number };
  title?: string;
}

export function FeaturedCollections({ config, title = "Coleções" }: FeaturedCollectionsProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("collections")
        .select("id, name, slug, description, image_url")
        .eq("is_active", true)
        .order("sort_order")
        .limit(config.limit || 4);
      setCollections((data as Collection[]) || []);
      setLoading(false);
    };
    fetch();
  }, [config.limit]);

  return (
    <section className="py-16 md:py-24 bg-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh opacity-20" />
      
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 rounded-full border border-accent/30 text-accent font-sans text-xs font-bold uppercase tracking-wider mb-3">
            Categorias
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold">{title}</h2>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl bg-primary-foreground/10" />)}
          </div>
        ) : collections.length === 0 ? (
          <p className="text-center text-primary-foreground/50 font-sans py-8">Nenhuma coleção encontrada.</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {collections.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Link to={`/colecao/${c.slug}`} className="group block">
                  <div className="relative h-56 rounded-2xl overflow-hidden border border-primary-foreground/10 hover-energy">
                    {c.image_url ? (
                      <img
                        src={c.image_url}
                        alt={c.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-50 group-hover:opacity-70"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-accent/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent" />
                    
                    {/* Orange accent line at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    
                    <div className="absolute bottom-5 left-5 right-5">
                      <h3 className="font-display text-xl font-bold text-primary-foreground uppercase">{c.name}</h3>
                      <span className="inline-flex items-center gap-1 text-accent font-sans text-xs font-bold mt-1.5 uppercase tracking-wider group-hover:gap-2 transition-all">
                        Explorar <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
