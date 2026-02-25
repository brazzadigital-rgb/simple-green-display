import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingBag, Lock, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, loading, itemCount, subtotal, updateQuantity, removeItem } = useCart();

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <ShoppingBag className="w-20 h-20 mx-auto mb-6 text-muted-foreground/30" />
        <h1 className="font-display text-3xl font-bold mb-2">Carrinho vazio</h1>
        <p className="text-muted-foreground font-sans mb-8">Adicione produtos para continuar comprando</p>
        <Button asChild className="rounded-xl shine font-sans h-12 px-8">
          <Link to="/">Explorar produtos</Link>
        </Button>
      </div>
    );
  }

  const getItemImage = (item: any) => {
    const primary = item.product?.product_images?.find((i: any) => i.is_primary);
    return primary?.url || item.product?.product_images?.[0]?.url || "/placeholder.svg";
  };

  return (
    <div className="container py-8 md:py-12">
      <h1 className="font-display text-3xl font-bold mb-8">Carrinho ({itemCount})</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const price = item.variant?.price ?? item.product?.price ?? 0;
            const imageUrl = getItemImage(item);
            return (
              <motion.div key={item.id} layout>
                <Card className="border-0 shadow-premium">
                  <CardContent className="p-4 flex gap-4">
                    <div className="product-thumb-mini w-24 h-24 shrink-0">
                      <img src={imageUrl} alt={item.product?.name} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/produto/${item.product?.slug}`} className="font-sans text-sm font-medium hover:text-accent transition-colors line-clamp-2">
                        {item.product?.name}
                      </Link>
                      {item.variant && (
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">{item.variant.name}</p>
                      )}
                      <p className="font-sans text-xs text-muted-foreground mt-1">R$ {Number(price).toFixed(2)} un.</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border rounded-xl overflow-hidden">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors" disabled={loading}>
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-10 text-center font-sans text-sm font-semibold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors" disabled={loading}>
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-sans font-bold">R$ {(Number(price) * item.quantity).toFixed(2)}</span>
                          <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors" disabled={loading}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div>
          <Card className="border-0 shadow-premium sticky top-24">
            <CardContent className="p-6 space-y-5">
              <h3 className="font-display text-lg font-bold">Resumo do pedido</h3>

              <Separator />

              <div className="space-y-2 font-sans text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="text-muted-foreground">Calculado no checkout</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between font-sans">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">R$ {subtotal.toFixed(2)}</span>
              </div>

              <Button onClick={handleCheckout} disabled={loading} className="w-full h-12 rounded-xl shine font-sans font-bold bg-success hover:bg-success/90 text-success-foreground">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4 mr-2" /> Finalizar Compra</>}
              </Button>

              <Button asChild variant="ghost" className="w-full font-sans text-sm">
                <Link to="/">Continuar comprando</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
