import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/useCart";

// Reuse the same card components from FeaturedProducts
import { ProductCard, QuickBuyModal } from "@/components/store/sections/FeaturedProducts";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, loading: cartLoading } = useCart();
  const [quickBuyProduct, setQuickBuyProduct] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: colData } = await supabase
        .from("collections")
        .select("id, name, description, image_url")
        .eq("slug", slug!)
        .eq("is_active", true)
        .maybeSingle();

      if (!colData) { setLoading(false); return; }
      setCollection(colData as Collection);

      // Check both tables: collection_products AND product_categories
      const [cpRes, pcRes] = await Promise.all([
        supabase.from("collection_products").select("product_id").eq("collection_id", colData.id),
        supabase.from("product_categories").select("product_id").eq("collection_id", colData.id),
      ]);
      const allIds = [
        ...(cpRes.data || []),
        ...(pcRes.data || []),
      ].map((cp: any) => cp.product_id);
      const uniqueIds = [...new Set(allIds)];

      if (uniqueIds.length > 0) {
        const { data: prodData } = await supabase
          .from("products")
          .select(
            "id, name, slug, price, compare_at_price, stock, is_featured, is_new, sold_count, product_images(url, is_primary), product_variants(id, name, price, stock)"
          )
          .eq("is_active", true)
          .in("id", uniqueIds);
        setProducts((prodData as any) || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div className="container py-10">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-5 w-96 mb-10" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-2xl" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl font-bold mb-2">Coleção não encontrada</h1>
        <p className="text-muted-foreground font-sans">A coleção solicitada não existe ou foi desativada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh]">
      <section className="bg-primary text-primary-foreground py-16 mb-10">
        <div className="container">
          <h1 className="text-4xl font-display font-bold">{collection.name}</h1>
          {collection.description && <p className="text-primary-foreground/60 font-sans mt-3 max-w-xl">{collection.description}</p>}
        </div>
      </section>

      <div className="container px-3 md:px-4 pb-16">
        {products.length === 0 ? (
          <p className="text-center text-muted-foreground font-sans py-12">Nenhum produto nesta coleção ainda.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {products.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                addItem={addItem}
                cartLoading={cartLoading}
                onQuickBuy={setQuickBuyProduct}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {quickBuyProduct && (
          <QuickBuyModal
            product={quickBuyProduct}
            onClose={() => setQuickBuyProduct(null)}
            addItem={addItem}
            cartLoading={cartLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
