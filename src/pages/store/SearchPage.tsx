import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Heart } from "lucide-react";
import { motion } from "framer-motion";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  is_new: boolean;
  product_images: { url: string; is_primary: boolean }[];
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(query);

  useEffect(() => {
    if (!query) { setProducts([]); return; }
    const search = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, compare_at_price, is_new, product_images(url, is_primary)")
        .eq("is_active", true)
        .ilike("name", `%${query}%`)
        .limit(20);
      setProducts((data as any) || []);
      setLoading(false);
    };
    search();
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) setSearchParams({ q: searchTerm.trim() });
  };

  const getImage = (p: Product) => p.product_images?.find((i) => i.is_primary)?.url || p.product_images?.[0]?.url || "/placeholder.svg";

  return (
    <div className="container py-10 min-h-[60vh]">
      <h1 className="text-3xl font-display font-bold mb-6">Buscar Produtos</h1>

      <form onSubmit={handleSearch} className="relative max-w-xl mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="O que você procura?"
          className="h-12 pl-12 rounded-2xl text-base font-sans"
          autoFocus
        />
      </form>

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
      ) : query && products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground font-sans text-lg">Nenhum produto encontrado para "{query}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/produto/${product.slug}`} className="group block">
                <Card className="border-0 shadow-none hover:shadow-premium-lg transition-all duration-300 overflow-hidden rounded-2xl bg-transparent">
                  <div className="product-thumb !rounded-t-2xl !rounded-b-none">
                    <img src={getImage(product)} alt={product.name} loading="lazy" />
                    {product.is_new && (
                      <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground font-sans text-[10px] px-2 py-0.5 rounded-lg">Novo</Badge>
                    )}
                  </div>
                  <CardContent className="px-1 pt-3 pb-0">
                    <p className="font-sans text-sm font-medium truncate group-hover:text-accent transition-colors">{product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-sans text-base font-bold">R$ {Number(product.price).toFixed(2)}</span>
                      {product.compare_at_price && product.compare_at_price > product.price && (
                        <span className="font-sans text-xs text-muted-foreground line-through">R$ {Number(product.compare_at_price).toFixed(2)}</span>
                      )}
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
