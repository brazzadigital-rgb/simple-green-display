import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface VariantGroupDetail {
  group: string;
  name: string;
  price: number | null;
  variant_id: string | null;
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  metadata_json?: { variants_detail?: VariantGroupDetail[] } | null;
  product: {
    name: string;
    slug: string;
    price: number;
    compare_at_price: number | null;
    stock: number;
    product_images: { url: string; is_primary: boolean }[];
  };
  variant?: { name: string; price: number | null } | null;
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (productId: string, variantId?: string | null, qty?: number, metadata?: { variants_detail?: VariantGroupDetail[] }) => Promise<void>;
  updateQuantity: (itemId: string, qty: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const getOrCreateCart = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    if (cartId) return cartId;

    const { data: existingList } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (existingList && existingList.length > 0) {
      setCartId(existingList[0].id);
      return existingList[0].id;
    }

    const { data: created } = await supabase
      .from("carts")
      .insert({ user_id: user.id })
      .select("id")
      .single();

    if (created) {
      setCartId(created.id);
      return created.id;
    }
    return null;
  }, [user, cartId]);

  const fetchItems = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    const cid = await getOrCreateCart();
    if (!cid) { setLoading(false); return; }

    const { data } = await supabase
      .from("cart_items")
      .select(`
        id, product_id, variant_id, quantity, metadata_json,
        product:products(name, slug, price, compare_at_price, stock, product_images(url, is_primary)),
        variant:product_variants(name, price)
      `)
      .eq("cart_id", cid);

    setItems((data as any) || []);
    setLoading(false);
  }, [user, getOrCreateCart]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = async (productId: string, variantId: string | null = null, qty = 1, metadata?: { variants_detail?: VariantGroupDetail[] }) => {
    if (!user) { toast({ title: "Faça login para adicionar ao carrinho", variant: "destructive" }); return; }
    const cid = await getOrCreateCart();
    if (!cid) return;

    // Check if already in cart (only match if no grouped variants metadata)
    const existing = !metadata?.variants_detail?.length
      ? items.find(i => i.product_id === productId && i.variant_id === variantId)
      : null;
    if (existing) {
      await supabase.from("cart_items").update({ quantity: existing.quantity + qty }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({ cart_id: cid, product_id: productId, variant_id: variantId, quantity: qty, metadata_json: metadata || {} } as any);
    }
    await fetchItems();
    setIsOpen(true);
    toast({ title: "Adicionado ao carrinho! 🛒" });
  };

  const updateQuantity = async (itemId: string, qty: number) => {
    if (qty < 1) return removeItem(itemId);
    await supabase.from("cart_items").update({ quantity: qty }).eq("id", itemId);
    await fetchItems();
  };

  const removeItem = async (itemId: string) => {
    await supabase.from("cart_items").delete().eq("id", itemId);
    await fetchItems();
    toast({ title: "Item removido" });
  };

  const clearCart = async () => {
    if (!cartId) return;
    await supabase.from("cart_items").delete().eq("cart_id", cartId);
    setItems([]);
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => {
    const meta = i.metadata_json as any;
    const variantsDetail = meta?.variants_detail as VariantGroupDetail[] | undefined;
    if (variantsDetail && variantsDetail.length > 0) {
      const groupTotal = variantsDetail.reduce((s, v) => s + (v.price ? Number(v.price) : 0), 0);
      return sum + (groupTotal || Number(i.product?.price ?? 0)) * i.quantity;
    }
    const price = i.variant?.price ?? i.product?.price ?? 0;
    return sum + Number(price) * i.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ items, loading, itemCount, subtotal, isOpen, setIsOpen, addItem, updateQuantity, removeItem, clearCart, refresh: fetchItems }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
