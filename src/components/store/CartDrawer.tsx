import { useCart } from "@/hooks/useCart";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function CartDrawer() {
  const navigate = useNavigate();
  const { items, isOpen, setIsOpen, loading, itemCount, subtotal, updateQuantity, removeItem } = useCart();

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/checkout');
  };

  const getItemImage = (item: any) => {
    const primary = item.product?.product_images?.find((i: any) => i.is_primary);
    return primary?.url || item.product?.product_images?.[0]?.url || "/placeholder.svg";
  };

  const fmt = (v: number) => v.toFixed(2).replace(".", ",");

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-[92%] sm:max-w-[420px] p-0 flex flex-col bg-card border-l border-border/50 shadow-2xl">
        {/* ── Header ── */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-sans text-base font-semibold text-foreground tracking-wide">
              Meu Carrinho
              {itemCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {itemCount}
                </span>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-5">
              <ShoppingBag className="w-9 h-9 text-muted-foreground/40" />
            </div>
            <p className="font-sans text-lg font-semibold text-foreground mb-1">Carrinho vazio</p>
            <p className="font-sans text-sm text-muted-foreground text-center">
              Explore nossa coleção e adicione peças que combinam com você
            </p>
            <Button
              onClick={() => setIsOpen(false)}
              className="mt-6 rounded-xl font-sans bg-primary text-primary-foreground hover:bg-primary/90 px-6"
            >
              Explorar produtos
            </Button>
          </div>
        ) : (
          <>
            {/* ── Items list ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => {
                  const imageUrl = getItemImage(item);
                  const meta = item.metadata_json as any;
                  const variantsDetail = meta?.variants_detail;
                  const price = variantsDetail?.length
                    ? variantsDetail.reduce((s: number, v: any) => s + (v.price ? Number(v.price) : 0), 0) || (item.product?.price ?? 0)
                    : (item.variant?.price ?? item.product?.price ?? 0);
                  const totalPrice = Number(price) * item.quantity;

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -40, scale: 0.95 }}
                      transition={{ delay: index * 0.03, duration: 0.25 }}
                      className="group flex gap-3.5 p-3.5 rounded-2xl bg-background border border-border/40 hover:border-border/60 hover:shadow-premium transition-all duration-300"
                    >
                      {/* Image */}
                      <div className="product-thumb-mini w-[76px] h-[76px] shrink-0 border border-border/20">
                        <img
                          src={imageUrl}
                          alt={item.product?.name}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <p className="font-sans text-[13px] font-medium text-foreground leading-snug line-clamp-2 pr-6">
                          {item.product?.name}
                        </p>

                        {variantsDetail?.length ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {variantsDetail.map((vd: any, idx: number) => (
                              <span key={idx} className="chip-jewel self-start text-[9px]">
                                {vd.group}: {vd.name}
                              </span>
                            ))}
                          </div>
                        ) : item.variant ? (
                          <span className="chip-jewel mt-1 self-start text-[9px]">
                            {item.variant.name}
                          </span>
                        ) : null}

                        <div className="flex items-end justify-between mt-auto pt-2">
                          {/* Quantity controls */}
                          <div className="flex items-center rounded-lg border border-border/50 bg-muted/20">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-l-lg text-muted-foreground hover:text-foreground transition-colors min-h-[unset] min-w-[unset]"
                              disabled={loading}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-sans text-xs font-semibold text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-r-lg text-muted-foreground hover:text-foreground transition-colors min-h-[unset] min-w-[unset]"
                              disabled={loading}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Price */}
                          <p className="font-sans text-sm font-bold text-foreground">
                            R$ {fmt(totalPrice)}
                          </p>
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all min-h-[unset] min-w-[unset] p-1"
                        disabled={loading}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <div className="border-t border-border/40 bg-background/80 backdrop-blur-sm">
              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 py-3 border-b border-border/20">
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Truck className="w-3 h-3" />
                  Entrega rápida
                </span>
                <span className="w-px h-3 bg-border/40" />
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <ShieldCheck className="w-3 h-3" />
                  Compra segura
                </span>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="font-sans text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-sans text-xl font-bold text-foreground">
                    R$ {fmt(subtotal)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/60 font-sans -mt-2">
                  Frete calculado no checkout
                </p>

                {/* CTAs */}
                <div className="flex flex-col gap-2.5">
                  <Button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="h-[52px] rounded-2xl font-sans text-sm font-bold bg-primary text-primary-foreground hover:bg-primary-dark active:scale-[0.98] transition-all shadow-premium"
                  >
                    Finalizar Compra
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className="h-10 rounded-xl font-sans text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    Continuar comprando
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
