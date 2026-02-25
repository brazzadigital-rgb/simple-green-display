import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Percent } from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  is_new: boolean;
  product_images: { url: string; is_primary: boolean }[];
}

export default function OffersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, compare_at_price, is_new, product_images(url, is_primary)")
        .eq("is_active", true)
        .not("compare_at_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);
      // Filter client-side to ensure actual discount
      const filtered = (data as any)?.filter((p: Product) => p.compare_at_price && p.compare_at_price > p.price) || [];
      setProducts(filtered);
      setLoading(false);
    };
    fetch();
  }, []);

  const getImage = (p: Product) => p.product_images?.find((i) => i.is_primary)?.url || p.product_images?.[0]?.url || "/placeholder.svg";
  const discount = (p: Product) => Math.round(((p.compare_at_price! - p.price) / p.compare_at_price!) * 100);

  return (
    <div className="container py-10 min-h-[60vh]">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Percent className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Ofertas</h1>
          <p className="text-muted-foreground font-sans text-sm">Produtos com descontos especiais</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-2xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="text-center text-muted-foreground font-sans py-16">Nenhuma oferta disponível no momento.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/produto/${product.slug}`} className="group block">
                <Card className="border-0 shadow-none hover:shadow-premium-lg transition-all duration-300 overflow-hidden rounded-2xl bg-transparent">
                  <div className="product-thumb !rounded-t-2xl !rounded-b-none">
                    <img src={getImage(product)} alt={product.name} loading="lazy" />
                    <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground font-sans text-[10px] px-2 py-0.5 rounded-lg">
                      -{discount(product)}%
                    </Badge>
                  </div>
                  <CardContent className="px-1 pt-3 pb-0">
                    <p className="font-sans text-sm font-medium truncate group-hover:text-accent transition-colors">{product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-sans text-base font-bold">R$ {Number(product.price).toFixed(2)}</span>
                      <span className="font-sans text-xs text-muted-foreground line-through">R$ {Number(product.compare_at_price).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
