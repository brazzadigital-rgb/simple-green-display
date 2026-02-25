import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/hooks/useCart";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FavProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  product_images: { url: string; is_primary: boolean }[];
}

export default function Favorites() {
  const { items: wishlistItems, remove, loading: wlLoading } = useWishlist();
  const { addItem } = useCart();
  const [products, setProducts] = useState<FavProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      if (wishlistItems.length === 0) { setProducts([]); setLoading(false); return; }

      const ids = wishlistItems.map(i => i.product_id);
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, compare_at_price, product_images(url, is_primary)")
        .in("id", ids);
      setProducts((data as FavProduct[]) || []);
      setLoading(false);
    };
    fetchProducts();
  }, [wishlistItems]);

  const getImage = (p: FavProduct) => {
    const imgs = p.product_images || [];
    return imgs.find(i => i.is_primary)?.url || imgs[0]?.url || "/placeholder.svg";
  };

  const handleAddToCart = async (p: FavProduct) => {
    await addItem(p.id);
    toast({ title: "Adicionado ao carrinho! 🛒" });
  };

  const handleRemove = async (productId: string) => {
    await remove(productId);
    toast({ title: "Removido dos favoritos" });
  };

  const fmt = (v: number) => v.toFixed(2).replace(".", ",");

  if (loading || wlLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
          <Heart className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <p className="font-display text-xl font-bold mb-2">Você ainda não favoritou nenhum item</p>
        <p className="text-muted-foreground font-sans text-sm mb-8 max-w-sm mx-auto">
          Explore nosso catálogo e marque as peças que mais te encantam
        </p>
        <Link
          to="/produtos"
          className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl bg-primary text-primary-foreground font-sans text-sm font-bold hover:brightness-110 transition-all"
        >
          Explorar catálogo <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Meus Favoritos</h2>
        <span className="text-sm font-sans text-muted-foreground">{wishlistItems.length} {wishlistItems.length === 1 ? "item" : "itens"}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {products.map((p) => {
            const discount = p.compare_at_price && p.compare_at_price > p.price
              ? Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)
              : 0;

            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: -30 }}
                transition={{ duration: 0.25 }}
                className="group relative rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm hover:shadow-premium transition-all"
              >
                <div className="flex gap-4 p-4">
                  <Link to={`/produto/${p.slug}`} className="product-thumb-mini w-24 h-24 shrink-0">
                    <img src={getImage(p)} alt={p.name} />
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <Link to={`/produto/${p.slug}`} className="font-sans text-sm font-semibold hover:text-accent transition-colors line-clamp-2">
                        {p.name}
                      </Link>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-sans text-lg font-bold">R$ {fmt(p.price)}</span>
                        {discount > 0 && p.compare_at_price && (
                          <>
                            <span className="font-sans text-xs text-muted-foreground line-through">R$ {fmt(p.compare_at_price)}</span>
                            <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">-{discount}%</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleAddToCart(p)}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground font-sans text-xs font-bold hover:brightness-110 transition-all active:scale-[0.97]"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Carrinho
                      </button>
                      <Link
                        to={`/produto/${p.slug}`}
                        className="inline-flex items-center h-9 px-3 rounded-xl border border-border text-xs font-sans font-medium hover:bg-muted transition-colors"
                      >
                        Ver produto
                      </Link>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(p.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
