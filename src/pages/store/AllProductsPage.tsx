import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, X, ChevronRight, ChevronDown,
  ArrowUpDown, Grid3X3, LayoutGrid, Package,
} from "lucide-react";

/* ── Types ─────────────────── */
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  is_new: boolean;
  is_bestseller: boolean;
  is_featured: boolean;
  free_shipping: boolean;
  sold_count: number;
  created_at: string;
  product_images: { url: string; is_primary: boolean }[];
}

interface Collection {
  id: string;
  name: string;
  slug: string;
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevância" },
  { value: "bestsellers", label: "Mais vendidos" },
  { value: "newest", label: "Novidades" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "discount", label: "Maior desconto" },
] as const;

const PRODUCTS_PER_PAGE = 24;

/* ── Product Card ─────────────────── */
function ProductCard({ product, index }: { product: Product; index: number }) {
  const img = product.product_images?.find((i) => i.is_primary)?.url || product.product_images?.[0]?.url || "/placeholder.svg";
  const discount = product.compare_at_price && product.compare_at_price > product.price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link to={`/produto/${product.slug}`} className="group block">
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)] hover:-translate-y-1">
          <div className="relative aspect-square overflow-hidden">
            <img
              src={img}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
              {product.is_new && (
                <Badge className="bg-accent text-accent-foreground font-sans text-[10px] px-2 py-0.5 rounded-full">Novo</Badge>
              )}
              {discount > 0 && (
                <Badge className="bg-destructive/90 text-destructive-foreground font-sans text-[10px] px-2 py-0.5 rounded-full">-{discount}%</Badge>
              )}
              {product.free_shipping && (
                <Badge className="bg-success/90 text-success-foreground font-sans text-[10px] px-2 py-0.5 rounded-full">Frete Grátis</Badge>
              )}
            </div>
            {product.stock <= 0 && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <span className="font-sans text-sm font-semibold text-muted-foreground">Esgotado</span>
              </div>
            )}
          </div>
          <div className="p-3 space-y-1.5">
            <p className="font-sans text-sm font-medium truncate group-hover:text-accent transition-colors">{product.name}</p>
            <div className="flex items-baseline gap-2">
              <span className="font-sans text-base font-bold">R$ {product.price.toFixed(2).replace('.', ',')}</span>
              {discount > 0 && product.compare_at_price && (
                <span className="font-sans text-[11px] text-muted-foreground line-through">R$ {product.compare_at_price.toFixed(2).replace('.', ',')}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Filter Panel ─────────────────── */
function FilterPanel({
  collections, selectedCollection, setSelectedCollection,
  priceRange, setPriceRange, maxPrice,
  inStockOnly, setInStockOnly,
  freeShippingOnly, setFreeShippingOnly,
  onSaleOnly, setOnSaleOnly,
  activeFilterCount, clearFilters,
}: {
  collections: Collection[];
  selectedCollection: string;
  setSelectedCollection: (v: string) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  maxPrice: number;
  inStockOnly: boolean;
  setInStockOnly: (v: boolean) => void;
  freeShippingOnly: boolean;
  setFreeShippingOnly: (v: boolean) => void;
  onSaleOnly: boolean;
  setOnSaleOnly: (v: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price: true,
    collection: true,
    options: true,
  });

  const toggle = (key: string) => setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="space-y-5">
      {activeFilterCount > 0 && (
        <button onClick={clearFilters} className="text-xs font-sans font-medium text-accent hover:underline">
          Limpar todos os filtros ({activeFilterCount})
        </button>
      )}

      {/* Price */}
      <div>
        <button onClick={() => toggle("price")} className="w-full flex items-center justify-between py-2 min-h-[unset]">
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">Faixa de preço</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections.price ? "rotate-180" : ""}`} />
        </button>
        {openSections.price && (
          <div className="space-y-4 pt-2">
            <Slider
              min={0}
              max={maxPrice}
              step={5}
              value={priceRange}
              onValueChange={(v) => setPriceRange(v as [number, number])}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl border border-border/60 bg-card px-3 py-2">
                <span className="text-[10px] text-muted-foreground font-sans block">Mín</span>
                <span className="text-sm font-sans font-semibold">R$ {priceRange[0]}</span>
              </div>
              <span className="text-muted-foreground text-xs">—</span>
              <div className="flex-1 rounded-xl border border-border/60 bg-card px-3 py-2">
                <span className="text-[10px] text-muted-foreground font-sans block">Máx</span>
                <span className="text-sm font-sans font-semibold">R$ {priceRange[1]}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border/40" />

      {/* Collections */}
      {collections.length > 0 && (
        <>
          <div>
            <button onClick={() => toggle("collection")} className="w-full flex items-center justify-between py-2 min-h-[unset]">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">Coleção</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections.collection ? "rotate-180" : ""}`} />
            </button>
            {openSections.collection && (
              <div className="space-y-1 pt-1">
                <button
                  onClick={() => setSelectedCollection("")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-sans transition-all min-h-[unset] ${
                    !selectedCollection ? "bg-accent/10 text-accent font-semibold" : "hover:bg-muted/60 text-foreground/70"
                  }`}
                >
                  Todas
                </button>
                {collections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCollection(c.id === selectedCollection ? "" : c.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-sans transition-all min-h-[unset] ${
                      selectedCollection === c.id ? "bg-accent/10 text-accent font-semibold" : "hover:bg-muted/60 text-foreground/70"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-border/40" />
        </>
      )}

      {/* Toggle options */}
      <div>
        <button onClick={() => toggle("options")} className="w-full flex items-center justify-between py-2 min-h-[unset]">
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">Opções</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openSections.options ? "rotate-180" : ""}`} />
        </button>
        {openSections.options && (
          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-sans text-foreground/80">Em estoque</span>
              <Switch checked={inStockOnly} onCheckedChange={setInStockOnly} />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-sans text-foreground/80">Frete grátis</span>
              <Switch checked={freeShippingOnly} onCheckedChange={setFreeShippingOnly} />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-sans text-foreground/80">Em promoção</span>
              <Switch checked={onSaleOnly} onCheckedChange={setOnSaleOnly} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────── */
export default function AllProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // State from URL
  const searchQuery = searchParams.get("q") || "";
  const sortBy = searchParams.get("sort") || "relevance";
  const collectionFilter = searchParams.get("collection") || "";
  const inStockOnly = searchParams.get("inStock") === "1";
  const freeShippingOnly = searchParams.get("freeShipping") === "1";
  const onSaleOnly = searchParams.get("onSale") === "1";
  const priceMin = parseInt(searchParams.get("priceMin") || "0", 10);
  const priceMax = parseInt(searchParams.get("priceMax") || "0", 10);
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [priceRange, setPriceRange] = useState<[number, number]>([priceMin, priceMax || 1000]);
  const [sortOpen, setSortOpen] = useState(false);

  // Fetch products + collections
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [productsRes, collectionsRes] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, slug, price, compare_at_price, stock, is_new, is_bestseller, is_featured, free_shipping, sold_count, created_at, product_images(url, is_primary)")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("collections")
          .select("id, name, slug")
          .eq("is_active", true)
          .order("sort_order"),
      ]);
      const products = (productsRes.data as Product[]) || [];
      setAllProducts(products);
      setCollections((collectionsRes.data as Collection[]) || []);

      if (products.length > 0) {
        const mp = Math.ceil(Math.max(...products.map((p) => p.price)) / 50) * 50;
        setMaxPrice(mp);
        if (!priceMax) setPriceRange([0, mp]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Sync price range from URL only on mount
  useEffect(() => {
    if (priceMax > 0) setPriceRange([priceMin, priceMax]);
  }, []);

  // Collection product IDs
  const [collectionProductIds, setCollectionProductIds] = useState<string[]>([]);
  useEffect(() => {
    if (!collectionFilter) { setCollectionProductIds([]); return; }
    const fetchCollectionProducts = async () => {
      // Try both tables since data may be in either
      const [cpRes, pcRes] = await Promise.all([
        supabase.from("collection_products").select("product_id").eq("collection_id", collectionFilter),
        supabase.from("product_categories").select("product_id").eq("collection_id", collectionFilter),
      ]);
      const ids = new Set([
        ...((cpRes.data || []).map((d) => d.product_id)),
        ...((pcRes.data || []).map((d) => d.product_id)),
      ]);
      setCollectionProductIds(Array.from(ids));
    };
    fetchCollectionProducts();
  }, [collectionFilter]);

  // Filter + sort
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Collection
    if (collectionFilter && collectionProductIds.length > 0) {
      result = result.filter((p) => collectionProductIds.includes(p.id));
    } else if (collectionFilter && collectionProductIds.length === 0) {
      result = [];
    }

    // Price
    const effectiveMax = priceRange[1] || maxPrice;
    result = result.filter((p) => p.price >= priceRange[0] && p.price <= effectiveMax);

    // Toggles
    if (inStockOnly) result = result.filter((p) => p.stock > 0);
    if (freeShippingOnly) result = result.filter((p) => p.free_shipping);
    if (onSaleOnly) result = result.filter((p) => p.compare_at_price !== null && p.compare_at_price > p.price);

    // Sort
    switch (sortBy) {
      case "bestsellers": result.sort((a, b) => b.sold_count - a.sold_count); break;
      case "newest": result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "price_asc": result.sort((a, b) => a.price - b.price); break;
      case "price_desc": result.sort((a, b) => b.price - a.price); break;
      case "discount":
        result.sort((a, b) => {
          const dA = a.compare_at_price ? ((a.compare_at_price - a.price) / a.compare_at_price) : 0;
          const dB = b.compare_at_price ? ((b.compare_at_price - b.price) / b.compare_at_price) : 0;
          return dB - dA;
        });
        break;
    }

    return result;
  }, [allProducts, searchQuery, sortBy, collectionFilter, collectionProductIds, priceRange, inStockOnly, freeShippingOnly, onSaleOnly, maxPrice]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);

  // URL update helpers
  const updateParams = useCallback((updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v) newParams.set(k, v); else newParams.delete(k);
    });
    newParams.delete("page"); // reset page on filter change
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const setSort = (v: string) => {
    updateParams({ sort: v === "relevance" ? "" : v });
    setSortOpen(false);
  };

  const setCollection = (v: string) => updateParams({ collection: v });
  const setInStock = (v: boolean) => updateParams({ inStock: v ? "1" : "" });
  const setFreeShipping = (v: boolean) => updateParams({ freeShipping: v ? "1" : "" });
  const setOnSale = (v: boolean) => updateParams({ onSale: v ? "1" : "" });

  const applyPriceRange = (range: [number, number]) => {
    setPriceRange(range);
    updateParams({
      priceMin: range[0] > 0 ? String(range[0]) : "",
      priceMax: range[1] < maxPrice ? String(range[1]) : "",
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput.trim() });
  };

  const activeFilterCount = [
    collectionFilter, inStockOnly, freeShippingOnly, onSaleOnly,
    priceRange[0] > 0, priceRange[1] < maxPrice,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setPriceRange([0, maxPrice]);
    setSearchParams(searchQuery ? { q: searchQuery } : {}, { replace: true });
  };

  // Active filter chips
  const activeChips: { label: string; clear: () => void }[] = [];
  if (searchQuery) activeChips.push({ label: `"${searchQuery}"`, clear: () => updateParams({ q: "" }) });
  if (collectionFilter) {
    const col = collections.find((c) => c.id === collectionFilter);
    activeChips.push({ label: col?.name || "Coleção", clear: () => setCollection("") });
  }
  if (priceRange[0] > 0 || priceRange[1] < maxPrice) {
    activeChips.push({ label: `R$ ${priceRange[0]} – R$ ${priceRange[1]}`, clear: () => applyPriceRange([0, maxPrice]) });
  }
  if (inStockOnly) activeChips.push({ label: "Em estoque", clear: () => setInStock(false) });
  if (freeShippingOnly) activeChips.push({ label: "Frete grátis", clear: () => setFreeShipping(false) });
  if (onSaleOnly) activeChips.push({ label: "Em promoção", clear: () => setOnSale(false) });

  const filterPanelProps = {
    collections,
    selectedCollection: collectionFilter,
    setSelectedCollection: setCollection,
    priceRange,
    setPriceRange: applyPriceRange,
    maxPrice,
    inStockOnly,
    setInStockOnly: setInStock,
    freeShippingOnly,
    setFreeShippingOnly: setFreeShipping,
    onSaleOnly,
    setOnSaleOnly: setOnSale,
    activeFilterCount,
    clearFilters,
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="container px-4 md:px-6 py-5 md:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-sans font-medium uppercase tracking-widest mb-4">
          <Link to="/" className="hover:text-accent transition-colors">Início</Link>
          <ChevronRight className="w-3 h-3 opacity-40" />
          <span className="text-foreground/70">Todos os Produtos</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Todos os Produtos</h1>
            <p className="text-sm text-muted-foreground font-sans mt-1">
              {loading ? "Carregando..." : `${filteredProducts.length} produto${filteredProducts.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative w-full md:max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar produtos..."
              className="w-full h-11 rounded-full border border-border/60 bg-card text-sm font-sans pl-11 pr-4 focus:outline-none focus:border-accent/40 focus:shadow-[0_0_0_3px_hsl(var(--accent)/0.1)] transition-all"
            />
          </form>
        </div>
      </div>

      {/* Mobile filter/sort bar */}
      <div className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full text-xs font-sans gap-1.5 h-9 border-border/60">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtrar
                {activeFilterCount > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center min-h-[unset] min-w-[unset]">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle className="font-display text-lg">Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-4 overflow-y-auto max-h-[calc(80vh-100px)] pb-8">
                <FilterPanel {...filterPanelProps} />
              </div>
            </SheetContent>
          </Sheet>

          {/* Sort dropdown */}
          <div className="relative flex-1">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-sans gap-1.5 h-9 border-border/60 w-full justify-between"
              onClick={() => setSortOpen(!sortOpen)}
            >
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5" />
                {SORT_OPTIONS.find((s) => s.value === sortBy)?.label || "Ordenar"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
            </Button>
            <AnimatePresence>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border/60 rounded-2xl shadow-lg z-20 overflow-hidden"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSort(opt.value)}
                        className={`w-full text-left px-4 py-2.5 text-sm font-sans transition-colors min-h-[unset] ${
                          sortBy === opt.value ? "bg-accent/10 text-accent font-semibold" : "hover:bg-muted/60"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="container px-4 md:px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <motion.span
                key={chip.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs font-sans font-medium rounded-full pl-3 pr-1.5 py-1 border border-accent/20"
              >
                {chip.label}
                <button onClick={chip.clear} className="w-5 h-5 rounded-full hover:bg-accent/20 flex items-center justify-center min-h-[unset] min-w-[unset]">
                  <X className="w-3 h-3" />
                </button>
              </motion.span>
            ))}
            {activeChips.length > 1 && (
              <button onClick={clearFilters} className="text-xs font-sans text-muted-foreground hover:text-accent transition-colors min-h-[unset]">
                Limpar tudo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container px-4 md:px-6 pb-16">
        <div className="flex gap-8">
          {/* Desktop sidebar filters */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar">
              <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-[0_1px_8px_-2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
                  </h2>
                </div>
                <FilterPanel {...filterPanelProps} />
              </div>

              {/* Desktop sort */}
              <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-[0_1px_8px_-2px_rgba(0,0,0,0.04)]">
                <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                  <ArrowUpDown className="w-3.5 h-3.5" /> Ordenar por
                </h2>
                <div className="space-y-0.5">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSort(opt.value)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm font-sans transition-all min-h-[unset] ${
                        sortBy === opt.value ? "bg-accent/10 text-accent font-semibold" : "hover:bg-muted/60 text-foreground/70"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Products grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square rounded-2xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : paginatedProducts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-sans text-lg text-muted-foreground">Nenhum produto encontrado</p>
                <p className="font-sans text-sm text-muted-foreground/70 mt-1">Tente ajustar os filtros ou buscar outro termo</p>
                {activeFilterCount > 0 && (
                  <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                )}
              </motion.div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
                  {paginatedProducts.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          const newParams = new URLSearchParams(searchParams);
                          if (p === 1) newParams.delete("page");
                          else newParams.set("page", String(p));
                          setSearchParams(newParams, { replace: true });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={`w-10 h-10 rounded-full font-sans text-sm font-medium transition-all min-h-[unset] min-w-[unset] ${
                          page === p
                            ? "bg-accent text-accent-foreground shadow-md"
                            : "hover:bg-muted/60 text-muted-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
