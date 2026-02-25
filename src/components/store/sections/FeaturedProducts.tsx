import { useEffect, useState, useRef, useCallback, TouchEvent as ReactTouchEvent, UIEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { FavoriteButton } from "@/components/store/FavoriteButton";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  Loader2,
  Truck,
  Eye,
  Zap,
  Flame,
  CreditCard,
  X,
  Minus,
  Plus,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

/* ── types ─────────────────────────────────────────── */
interface ProductImage { url: string; is_primary: boolean }
interface ProductVariant { id: string; name: string; price: number | null; stock: number }

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  is_featured: boolean;
  is_new: boolean;
  sold_count: number;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
}

interface FeaturedProductsProps {
  config: { limit?: number };
  title?: string;
}

/* ── helpers ───────────────────────────────────────── */
const fmt = (v: number) => v.toFixed(2).replace(".", ",");
const getDiscount = (p: Product) => {
  if (!p.compare_at_price || p.compare_at_price <= p.price) return 0;
  return Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100);
};
const installment = (price: number) => `12x de R$ ${fmt(price / 12)} s/ juros`;

const getAllImages = (p: Product) => {
  const imgs = p.product_images ?? [];
  if (imgs.length === 0) return ["/placeholder.svg"];
  const primary = imgs.find((i) => i.is_primary);
  const sorted = primary
    ? [primary.url, ...imgs.filter((i) => i.url !== primary.url).map((i) => i.url)]
    : imgs.map((i) => i.url);
  return sorted;
};

/* ── ImageCarousel (touch swipe) ───────────────────── */
function ImageCarousel({
  images,
  alt,
  onTap,
}: {
  images: string[];
  alt: string;
  onTap: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchDelta = useRef(0);
  const swiped = useRef(false);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const count = images.length;

  const handleTouchStart = (e: ReactTouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchDelta.current = 0;
    swiped.current = false;
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: ReactTouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    // Determine direction on first significant movement
    if (isHorizontalSwipe.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      isHorizontalSwipe.current = Math.abs(dx) > Math.abs(dy);
    }
    if (isHorizontalSwipe.current) {
      touchDelta.current = dx;
    }
  };

  const handleTouchEnd = () => {
    if (isHorizontalSwipe.current && Math.abs(touchDelta.current) > 40 && count > 1) {
      swiped.current = true;
      if (touchDelta.current < 0) setCurrent((c) => (c + 1) % count);
      else setCurrent((c) => (c - 1 + count) % count);
    }
    touchStart.current = null;
    isHorizontalSwipe.current = null;
  };

  const handleClick = () => {
    if (!swiped.current) onTap();
  };

  // Desktop hover swap
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="product-thumb !rounded-t-2xl !rounded-b-none cursor-pointer"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      onMouseEnter={() => count > 1 && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? alt : `${alt} - ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-contain transition-all duration-700 ease-out will-change-[opacity,transform] ${
            i === current ? "opacity-100" : "opacity-0"
          } ${i === 0 && hovered && count > 1 && current === 0 ? "md:opacity-0" : ""}
          ${i === 1 && hovered && count > 1 && current === 0 ? "md:opacity-100" : ""}`}
          loading={i === 0 ? "eager" : "lazy"}
          draggable={false}
        />
      ))}

      {/* Dots */}
      {count > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {images.map((_, i) => (
            <span
              key={i}
              className={`block w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                i === current ? "bg-accent w-3" : "bg-foreground/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── QuickBuyModal (bottom sheet mobile) ───────────── */
export function QuickBuyModal({
  product,
  onClose,
  addItem,
  cartLoading,
}: {
  product: Product;
  onClose: () => void;
  addItem: (id: string, variantId?: string | null, qty?: number) => Promise<void>;
  cartLoading: boolean;
}) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    product.product_variants?.[0]?.id ?? null
  );
  const [qty, setQty] = useState(1);
  const disc = getDiscount(product);
  const images = getAllImages(product);
  const variants = product.product_variants ?? [];
  const activeVariant = variants.find((v) => v.id === selectedVariant);
  const finalPrice = activeVariant?.price ?? product.price;

  // Swipe-to-close
  const dragRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleBuy = async () => {
    await addItem(product.id, selectedVariant, qty);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        ref={panelRef}
        className="relative w-full md:max-w-lg max-h-[90vh] overflow-y-auto bg-card rounded-t-3xl md:rounded-3xl shadow-2xl border border-border/50"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100) onClose();
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 md:p-6 space-y-5">
          {/* Header */}
          <div className="flex gap-4">
            <div className="product-thumb-mini w-24 h-24 md:w-28 md:h-28 flex-shrink-0">
              <img src={images[0]} alt={product.name} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-sans text-sm font-semibold leading-snug line-clamp-2">{product.name}</p>
              {product.compare_at_price && product.compare_at_price > finalPrice && (
                <p className="font-sans text-xs text-muted-foreground line-through">
                  R$ {fmt(product.compare_at_price)}
                </p>
              )}
              <p className="font-display text-2xl font-bold">R$ {fmt(finalPrice)}</p>
              <p className="font-sans text-[11px] text-muted-foreground">{installment(finalPrice)}</p>
              {disc > 0 && (
                <span className="inline-flex px-2 py-[2px] rounded bg-destructive/10 text-destructive text-[10px] font-bold">
                  -{disc}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div className="space-y-2">
              <p className="font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wider">Variação</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v.id)}
                    disabled={v.stock <= 0}
                    className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      selectedVariant === v.id
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-foreground hover:border-accent/50"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {v.name}
                    {v.stock <= 0 && " (esgotado)"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <p className="font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantidade</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-11 h-11 rounded-xl border border-border flex items-center justify-center hover:bg-muted active:scale-95 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-sans text-base font-bold w-10 text-center">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-11 h-11 rounded-xl border border-border flex items-center justify-center hover:bg-muted active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleBuy}
            disabled={cartLoading || product.stock <= 0}
            className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-2xl bg-buttons text-white font-sans text-base font-bold py-4 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {cartLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                Comprar — R$ {fmt(finalPrice * qty)}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── ProductCard ───────────────────────────────────── */
export function ProductCard({
  product,
  index,
  addItem,
  cartLoading,
  onQuickBuy,
}: {
  product: Product;
  index: number;
  addItem: (id: string, variantId?: string | null, qty?: number) => Promise<void>;
  cartLoading: boolean;
  onQuickBuy: (p: Product) => void;
}) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const disc = getDiscount(product);
  const images = getAllImages(product);
  const isBestseller = product.sold_count >= 10;
  const lowStock = product.stock > 0 && product.stock <= 5;
  const variants = product.product_variants ?? [];

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addItem(product.id);
  };

  const handleQuickBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickBuy(product);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

    return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="h-full md:hover:-translate-y-[3px] md:transition-transform md:duration-300"
    >
      <div className="relative flex flex-col h-full bg-card rounded-2xl border border-border/40 overflow-hidden transition-all duration-300 md:hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)] group cursor-pointer">
        {/* ── Image ── */}
        <div className="relative">
          <ImageCarousel
            images={images}
            alt={product.name}
            onTap={() => navigate(`/produto/${product.slug}`)}
          />

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
            {disc > 0 && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-destructive/90 text-destructive-foreground font-sans text-[10px] font-semibold">
                -{disc}%
              </span>
            )}
            {product.is_new && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-sans text-[10px] font-semibold">
                Novo
              </span>
            )}
          </div>

          {/* Desktop hover actions */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                className="absolute top-2.5 right-2.5 z-10 hidden md:flex flex-col gap-1.5"
                initial={{ opacity: 0, x: 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.9 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <FavoriteButton
                    productId={product.id}
                    size="sm"
                    className="bg-card/90 backdrop-blur border border-border/50 hover:bg-accent hover:text-accent-foreground shadow-md"
                  />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Link
                    to={`/produto/${product.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-9 h-9 rounded-xl bg-card/90 backdrop-blur border border-border/50 flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors shadow-md"
                    title="Ver detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile favorite */}
          <FavoriteButton
            productId={product.id}
            size="sm"
            className="absolute top-2.5 right-2.5 z-10 md:hidden bg-card/80 backdrop-blur shadow"
          />
        </div>

        {/* ── Content ── */}
        <div className="flex flex-col flex-1 p-3 md:p-4">
          {/* Category label */}
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-accent mb-1">
            Coleção Premium
          </span>

          {/* Name */}
          <Link to={`/produto/${product.slug}`}>
            <p className="font-sans text-xs md:text-sm font-bold leading-snug line-clamp-2 hover:text-accent transition-colors min-h-[2.5em] uppercase">
              {product.name}
            </p>
          </Link>

          {/* Prices — pushed to bottom */}
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

          {/* Frete grátis badge */}
          <span className="inline-flex items-center gap-1 self-start mt-2 px-2.5 py-1 rounded-md bg-success/10 text-success font-sans text-[10px] font-bold uppercase tracking-wide border border-success/20">
            <Truck className="w-3 h-3" />
            Frete Grátis
          </span>

          {/* CTA */}
          <div className="flex gap-1.5 mt-3">
            <button
              onClick={handleQuickBuy}
              className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 rounded-xl bg-buttons text-white font-sans text-xs font-bold py-2 transition-all hover:brightness-110 active:scale-[0.96]"
            >
              <Zap className="w-3.5 h-3.5" />
              Comprar
            </button>
            <button
              onClick={handleAddToCart}
              disabled={cartLoading || product.stock <= 0}
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
}

/* ── ScrollHintCarousel ─────────────────────────────── */
function ScrollHintCarousel({
  products,
  addItem,
  cartLoading,
  onQuickBuy,
}: {
  products: Product[];
  addItem: (id: string, variantId?: string | null, qty?: number) => Promise<void>;
  cartLoading: boolean;
  onQuickBuy: (p: Product) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hintOpacity, setHintOpacity] = useState(1);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const opacity = Math.max(0, 1 - el.scrollLeft / 80);
    setHintOpacity(opacity);
    updateScrollState();
  };

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: direction === "right" ? amount : -amount, behavior: "smooth" });
  };

  useEffect(() => {
    updateScrollState();
  }, [products]);

  return (
    <div className="flex-1 min-w-0 relative group/carousel">
      {/* Swipe hint (mobile only) */}
      {hintOpacity > 0 && (
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 px-3 py-1.5 rounded-full bg-foreground/70 text-background font-sans text-[11px] font-semibold pointer-events-none animate-[swipe-hint_1.2s_ease-in-out_infinite] transition-opacity duration-300 md:hidden"
          style={{ opacity: hintOpacity }}
        >
          Arraste
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Arrow buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card/90 backdrop-blur border border-border/50 shadow-lg flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-all active:scale-95"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card/90 backdrop-blur border border-border/50 shadow-lg flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-all active:scale-95"
          aria-label="Próximo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-x-auto overflow-y-hidden scrollbar-hide overscroll-x-contain"
      >
        <div className="flex gap-3 md:gap-4 pr-4" style={{ width: "max-content" }}>
          {products.map((product, i) => (
            <div key={product.id} className="w-[44vw] min-w-[160px] md:w-[220px] lg:w-[240px] flex-shrink-0">
              <ProductCard
                product={product}
                index={i}
                addItem={addItem}
                cartLoading={cartLoading}
                onQuickBuy={onQuickBuy}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── FeaturedProducts ──────────────────────────────── */
export function FeaturedProducts({ config, title = "Produtos em Destaque" }: FeaturedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, loading: cartLoading } = useCart();
  const [quickBuyProduct, setQuickBuyProduct] = useState<Product | null>(null);
  const isBestsellersFilter = (config as any).filter === "bestsellers";

  useEffect(() => {
    const fetchProducts = async () => {
      let query = supabase
        .from("products")
        .select(
          "id, name, slug, price, compare_at_price, stock, is_featured, is_new, sold_count, product_images(url, is_primary), product_variants(id, name, price, stock)"
        )
        .eq("is_active", true);

      const filter = (config as any).filter;
      if (filter === "bestsellers") {
        query = query.order("sold_count", { ascending: false });
      } else if (filter === "new") {
        query = query.eq("is_new", true).order("created_at", { ascending: false });
      } else {
        query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
      }

      const { data } = await query.limit(config.limit || 8);
      setProducts((data as Product[]) || []);
      setLoading(false);
    };
    fetchProducts();
  }, [config.limit, (config as any).filter]);

  return (
    <>
      <section className="py-12 md:py-24">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 md:mb-12"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent font-sans text-xs font-bold uppercase tracking-wider mb-3">
              Destaques
            </span>
            <h2
              className="font-display text-3xl md:text-4xl lg:text-5xl font-black leading-tight uppercase"
            >
              {(() => {
                const words = title.toLowerCase().split(" ");
                const lastWord = words.pop();
                return (
                  <>
                    <span className="text-foreground">{words.join(" ")} </span>
                    <span className="text-primary">{lastWord}</span>
                  </>
                );
              })()}
            </h2>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square rounded-2xl" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-muted-foreground font-sans">Nenhum produto encontrado.</p>
              <p className="text-sm text-muted-foreground/60 font-sans">Adicione produtos no painel admin.</p>
            </div>
          ) : isBestsellersFilter ? (
            /* ── Bestsellers: highlight card + horizontal scroll ── */
            <div className="flex gap-4 md:gap-6 items-stretch overflow-hidden">
              {/* Left highlight card */}
              <div className="hidden md:flex flex-shrink-0 w-[280px] lg:w-[320px] rounded-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary/50" />
                <div className="absolute inset-0 bg-[url('/showcases/vitrine-namorados.jpg')] bg-cover bg-center mix-blend-overlay opacity-40" />
                <div className="relative z-10 flex flex-col justify-end p-6 text-primary-foreground">
                  <h3 className="font-sans text-2xl lg:text-3xl font-bold leading-tight mb-2">
                    Os produtos mais vendidos da sua coleção
                  </h3>
                  <p className="font-sans text-sm opacity-80 mb-5">
                    Veja mais produtos relacionados clicando no botão abaixo
                  </p>
                  <Link
                    to="/produtos?sort=bestsellers"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-card text-foreground font-sans text-sm font-bold hover:brightness-110 transition-all self-start"
                  >
                    Ver mais produtos
                  </Link>
                </div>
              </div>

              {/* Scrollable products */}
              <ScrollHintCarousel products={products} addItem={addItem} cartLoading={cartLoading} onQuickBuy={setQuickBuyProduct} />
            </div>
          ) : (
            /* ── Default: grid layout ── */
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
      </section>

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
    </>
  );
}
