import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

/* ── Types ── */
interface WishlistItem {
  id: string;
  product_id: string;
  variant_id: string | null;
}

interface WishlistContextType {
  items: WishlistItem[];
  count: number;
  loading: boolean;
  isFavorited: (productId: string, variantId?: string | null) => boolean;
  toggle: (productId: string, variantId?: string | null) => Promise<void>;
  remove: (productId: string, variantId?: string | null) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

/* ── Helpers ── */
const SESSION_KEY = "wishlist_session_id";

function getSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

/* ── Provider ── */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const hasSynced = useRef(false);

  /* Get or create wishlist */
  const getOrCreateWishlist = useCallback(async (): Promise<string | null> => {
    if (wishlistId) return wishlistId;

    if (user) {
      // Logged-in user
      const { data: existing } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) { setWishlistId(existing.id); return existing.id; }

      const { data: created } = await supabase
        .from("wishlists")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      if (created) { setWishlistId(created.id); return created.id; }
    } else {
      // Visitor
      const sid = getSessionId();
      const { data: existing } = await supabase
        .from("wishlists")
        .select("id")
        .eq("session_id", sid)
        .is("user_id", null)
        .maybeSingle();
      if (existing) { setWishlistId(existing.id); return existing.id; }

      const { data: created } = await supabase
        .from("wishlists")
        .insert({ session_id: sid })
        .select("id")
        .single();
      if (created) { setWishlistId(created.id); return created.id; }
    }
    return null;
  }, [user, wishlistId]);

  /* Fetch items */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const wid = await getOrCreateWishlist();
    if (!wid) { setItems([]); setLoading(false); return; }

    const { data } = await supabase
      .from("wishlist_items")
      .select("id, product_id, variant_id")
      .eq("wishlist_id", wid);
    setItems((data as WishlistItem[]) || []);
    setLoading(false);
  }, [getOrCreateWishlist]);

  /* Merge visitor wishlist into user wishlist on login */
  const mergeVisitorWishlist = useCallback(async () => {
    if (!user || hasSynced.current) return;
    hasSynced.current = true;

    const sid = localStorage.getItem(SESSION_KEY);
    if (!sid) return;

    // Find visitor wishlist
    const { data: visitorWl } = await supabase
      .from("wishlists")
      .select("id")
      .eq("session_id", sid)
      .is("user_id", null)
      .maybeSingle();
    if (!visitorWl) return;

    // Get visitor items
    const { data: visitorItems } = await supabase
      .from("wishlist_items")
      .select("product_id, variant_id")
      .eq("wishlist_id", visitorWl.id);
    if (!visitorItems || visitorItems.length === 0) return;

    // Get or create user wishlist
    let userWlId: string;
    const { data: userWl } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (userWl) {
      userWlId = userWl.id;
    } else {
      const { data: created } = await supabase
        .from("wishlists")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      if (!created) return;
      userWlId = created.id;
    }

    // Get existing user items to avoid duplicates
    const { data: existingItems } = await supabase
      .from("wishlist_items")
      .select("product_id, variant_id")
      .eq("wishlist_id", userWlId);

    const existingSet = new Set(
      (existingItems || []).map(i => `${i.product_id}|${i.variant_id || ""}`)
    );

    const toInsert = visitorItems
      .filter(i => !existingSet.has(`${i.product_id}|${i.variant_id || ""}`))
      .map(i => ({ wishlist_id: userWlId, product_id: i.product_id, variant_id: i.variant_id }));

    if (toInsert.length > 0) {
      await supabase.from("wishlist_items").insert(toInsert);
    }

    // Cleanup visitor wishlist
    await supabase.from("wishlist_items").delete().eq("wishlist_id", visitorWl.id);
    await supabase.from("wishlists").delete().eq("id", visitorWl.id);

    setWishlistId(userWlId);
  }, [user]);

  /* On user change: merge then fetch */
  useEffect(() => {
    setWishlistId(null);
    hasSynced.current = false;

    if (user) {
      mergeVisitorWishlist().then(() => fetchItems());
    } else {
      fetchItems();
    }
  }, [user]);

  /* Toggle favorite */
  const toggle = useCallback(async (productId: string, variantId: string | null = null) => {
    const existing = items.find(
      i => i.product_id === productId && (i.variant_id || null) === (variantId || null)
    );

    if (existing) {
      // Optimistic remove
      setItems(prev => prev.filter(i => i.id !== existing.id));
      const { error } = await supabase.from("wishlist_items").delete().eq("id", existing.id);
      if (error) {
        setItems(prev => [...prev, existing]);
        toast({ title: "Erro ao remover favorito", variant: "destructive" });
      } else {
        toast({ title: "Removido dos favoritos" });
      }
    } else {
      // Optimistic add
      const tempId = crypto.randomUUID();
      const tempItem: WishlistItem = { id: tempId, product_id: productId, variant_id: variantId };
      setItems(prev => [...prev, tempItem]);

      const wid = await getOrCreateWishlist();
      if (!wid) {
        setItems(prev => prev.filter(i => i.id !== tempId));
        return;
      }

      const { data, error } = await supabase
        .from("wishlist_items")
        .insert({ wishlist_id: wid, product_id: productId, variant_id: variantId })
        .select("id")
        .single();

      if (error) {
        setItems(prev => prev.filter(i => i.id !== tempId));
        toast({ title: "Erro ao favoritar", variant: "destructive" });
      } else if (data) {
        setItems(prev => prev.map(i => i.id === tempId ? { ...i, id: data.id } : i));
        toast({ title: "Adicionado aos favoritos ✨" });
      }
    }
  }, [items, getOrCreateWishlist]);

  const remove = useCallback(async (productId: string, variantId: string | null = null) => {
    const existing = items.find(
      i => i.product_id === productId && (i.variant_id || null) === (variantId || null)
    );
    if (existing) {
      setItems(prev => prev.filter(i => i.id !== existing.id));
      await supabase.from("wishlist_items").delete().eq("id", existing.id);
    }
  }, [items]);

  const isFavorited = useCallback((productId: string, variantId: string | null = null) => {
    return items.some(
      i => i.product_id === productId && (i.variant_id || null) === (variantId || null)
    );
  }, [items]);

  return (
    <WishlistContext.Provider value={{ items, count: items.length, loading, isFavorited, toggle, remove }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
