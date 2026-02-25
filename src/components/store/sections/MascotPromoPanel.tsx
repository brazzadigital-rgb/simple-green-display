import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingCart, Zap, Truck, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { FavoriteButton } from "@/components/store/FavoriteButton";
import mascotPromo from "@/assets/mascot-promo.png";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  product_images: { url: string; is_primary: boolean }[];
}

const fmt = (v: number) => v.toFixed(2).replace(".", ",");
const installment = (price: number) => `12x de R$ ${fmt(price / 12)} s/ juros`;

export function MascotPromoPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const { addItem, loading: cartLoading } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, compare_at_price, product_images(url, is_primary)")
        .eq("is_active", true)
        .order("sold_count", { ascending: false })
        .limit(4);
      setProducts((data as any) || []);
    };
    fetchProducts();
  }, []);

  const getImage = (p: Product) => {
    const primary = p.product_images?.find((i) => i.is_primary);
    return primary?.url || p.product_images?.[0]?.url || "/placeholder.svg";
  };

  const discount = (p: Product) => {
    if (!p.compare_at_price || p.compare_at_price <= p.price) return 0;
    return Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100);
  };

  return (
    <section className="py-8 md:py-14">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr] gap-4 md:gap-5 overflow-hidden">
          {/* Left mascot panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative rounded-2xl overflow-hidden min-h-[320px] md:min-h-full"
            style={{
              backgroundImage: `url(${mascotPromo})`,
              backgroundSize: "cover",
              backgroundPosition: "center top",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-primary/30" />
            <div className="relative z-10 p-6 md:p-8 flex flex-col justify-end h-full min-h-[320px] md:min-h-[420px]">
              <h3 className="font-display text-xl md:text-2xl lg:text-[1.65rem] font-bold leading-tight text-primary-foreground mb-3">
                Os produtos mais vendidos da sua coleção
              </h3>
              <p className="text-sm text-primary-foreground/50 font-sans mb-5 leading-relaxed">
                Veja mais produtos relacionados clicando no botão abaixo
              </p>
              <Link to="/colecoes">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-sans h-11 px-8 text-sm font-bold uppercase tracking-wider shine glow-orange transition-all duration-300 hover:glow-orange-lg">
                  Ver mais produtos
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Right product cards — same visual as ProductCard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {products.map((product, i) => {
              const disc = discount(product);
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -3, transition: { duration: 0.35, ease: "easeOut" } }}
                  className="h-full"
                >
                  <div className="relative flex flex-col h-full bg-card rounded-2xl border border-border/40 overflow-hidden transition-all duration-300 md:hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)] group cursor-pointer">
                    {/* Image */}
                    <div className="product-thumb !rounded-t-2xl !rounded-b-none cursor-pointer" onClick={() => navigate(`/produto/${product.slug}`)}>
                      <img
                        src={getImage(product)}
                        alt={product.name}
                        loading="lazy"
                      />
                      {disc > 0 && (
                        <span className="absolute top-2.5 left-2.5 z-10 inline-block px-2 py-0.5 rounded-full bg-destructive/90 text-destructive-foreground font-sans text-[10px] font-semibold">
                          -{disc}%
                        </span>
                      )}
                      <FavoriteButton
                        productId={product.id}
                        size="sm"
                        className="absolute top-2.5 right-2.5 z-10 md:hidden bg-card/80 backdrop-blur shadow"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-1 p-3 md:p-4">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-accent mb-1">
                        Coleção Premium
                      </span>
                      <Link to={`/produto/${product.slug}`}>
                        <p className="font-sans text-xs md:text-sm font-bold leading-snug line-clamp-2 hover:text-accent transition-colors min-h-[2.5em] uppercase">
                          {product.name}
                        </p>
                      </Link>

                      <div className="mt-auto pt-3">
                        {product.compare_at_price && product.compare_at_price > product.price && (
                          <p className="font-sans text-[11px] text-muted-foreground line-through leading-none mb-0.5">
                            R$ {fmt(product.compare_at_price)}
                          </p>
                        )}
                        <p className="font-sans text-lg md:text-xl font-bold text-foreground leading-tight">
                          R$ {fmt(product.price)}
                        </p>
                        <p className="font-sans text-[11px] text-muted-foreground mt-0.5">
                          em até {installment(product.price)}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 self-start mt-2 px-2.5 py-1 rounded-md bg-success/10 text-success font-sans text-[10px] font-bold uppercase tracking-wide border border-success/20">
                        <Truck className="w-3 h-3" />
                        Frete Grátis
                      </span>

                      {/* CTA */}
                      <div className="flex gap-1.5 mt-3">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/produto/${product.slug}`); }}
                          className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 rounded-xl bg-buttons text-white font-sans text-xs font-bold py-2 transition-all hover:brightness-110 active:scale-[0.96]"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Comprar
                        </button>
                        <button
                          onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await addItem(product.id); }}
                          disabled={cartLoading}
                          className="group/cart min-h-[40px] w-10 flex items-center justify-center rounded-xl border border-border hover:bg-accent hover:border-accent hover:text-accent-foreground active:scale-90 transition-all duration-300 disabled:opacity-50"
                        >
                          {cartLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShoppingCart className="w-4 h-4 transition-transform duration-300 group-hover/cart:scale-110 group-hover/cart:-rotate-12" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
