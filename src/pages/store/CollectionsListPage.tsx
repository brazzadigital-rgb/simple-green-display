import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

export default function CollectionsListPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("collections")
        .select("id, name, slug, description, image_url")
        .eq("is_active", true)
        .order("sort_order");
      setCollections((data as Collection[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="container py-10 min-h-[60vh]">
      <h1 className="text-3xl font-display font-bold mb-8">Nossas Coleções</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
      ) : collections.length === 0 ? (
        <p className="text-center text-muted-foreground font-sans py-16">Nenhuma coleção disponível.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Link to={`/colecao/${c.slug}`} className="group block">
                <div className="relative h-64 rounded-2xl overflow-hidden bg-primary">
                  {c.image_url && (
                    <img src={c.image_url} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60" loading="lazy" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5">
                    <h3 className="font-display text-xl font-bold text-white">{c.name}</h3>
                    {c.description && <p className="text-white/60 font-sans text-sm mt-1 line-clamp-2">{c.description}</p>}
                    <span className="inline-flex items-center gap-1 text-white/70 font-sans text-xs mt-2 group-hover:text-accent transition-colors">
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
  );
}
