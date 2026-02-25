import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PremiumToggle3D } from "@/components/ui/premium-toggle-3d";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useIsDemo } from "@/hooks/useIsDemo";
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, Eye,
  PackageOpen, Image, DollarSign, Warehouse, Truck, Layers, Search, Wrench, Settings2, Check
} from "lucide-react";
import { ProductImageGallery } from "@/components/admin/ProductImageGallery";
import { ImageUpload } from "@/components/store/ImageUpload";
import { motion, AnimatePresence } from "framer-motion";
import { VariationTemplateApplier } from "@/components/admin/VariationTemplateApplier";

interface ProductImage {
  id?: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

interface Supplier { id: string; trade_name: string; }
interface Collection { id: string; name: string; }

interface ProductVariant {
  id?: string;
  name: string;
  price: number | null;
  compare_at_price: number | null;
  stock: number;
  sku: string | null;
  sort_order: number;
  attribute_group?: string | null;
  color_hex?: string | null;
}

interface CustomField {
  id?: string;
  field_label: string;
  field_type: string;
  options: string[];
  max_length: number | null;
  is_required: boolean;
  sort_order: number;
}

const defaultForm = {
  name: "", slug: "", description: "", short_description: "",
  brand: "", tags: [] as string[], status: "active",
  is_active: true, is_featured: false, is_new: false, is_bestseller: false, show_on_home: false,
  price: 0, compare_at_price: null as number | null, cost_price: null as number | null,
  promo_start_date: "", promo_end_date: "",
  max_installments: 12, installments_interest: false, pix_discount: 0,
  wholesale_price: null as number | null, reseller_price: null as number | null,
  sku: "", barcode: "", stock: 0, min_stock_alert: 5,
  track_stock: true, allow_backorder: false, stock_location: "",
  supplier_id: null as string | null,
  product_type: "physical", weight: null as number | null,
  height: null as number | null, width: null as number | null, length: null as number | null,
  free_shipping: false, extra_prep_days: 0,
  meta_title: "", meta_description: "", og_image_url: "",
  hide_price: false, quote_only: false, is_subscription: false,
  related_product_ids: [] as string[], upsell_product_ids: [] as string[], crosssell_product_ids: [] as string[],
};

const tabs = [
  { v: "geral", l: "Geral", icon: PackageOpen, hint: "Informações básicas do produto" },
  { v: "midias", l: "Mídias", icon: Image, hint: "Fotos e imagens" },
  { v: "precos", l: "Preços", icon: DollarSign, hint: "Valores e promoções" },
  { v: "estoque", l: "Estoque", icon: Warehouse, hint: "Controle de inventário" },
  { v: "frete", l: "Frete", icon: Truck, hint: "Envio e dimensões" },
  { v: "variacoes", l: "Variações", icon: Layers, hint: "Tamanhos, cores, etc." },
  { v: "seo", l: "SEO", icon: Search, hint: "Otimização para buscas" },
  { v: "personalizacao", l: "Personalização", icon: Wrench, hint: "Campos customizáveis" },
  { v: "avancado", l: "Avançado", icon: Settings2, hint: "Configurações extras" },
];

export default function ProductEditor() {
  const { blockIfDemo } = useIsDemo();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [activeTab, setActiveTab] = useState("geral");
  const [form, setForm] = useState(defaultForm);
  const [formImages, setFormImages] = useState<ProductImage[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [tagInput, setTagInput] = useState("");

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const margin = useMemo(() => {
    if (form.cost_price && form.price) {
      const m = ((form.price - form.cost_price) / form.price) * 100;
      return m.toFixed(1);
    }
    return null;
  }, [form.cost_price, form.price]);

  useEffect(() => {
    const load = async () => {
      const [{ data: sups }, { data: cols }] = await Promise.all([
        supabase.from("suppliers").select("id, trade_name").eq("status", "active").order("trade_name"),
        supabase.from("collections").select("id, name").eq("is_active", true).order("name"),
      ]);
      setSuppliers((sups as Supplier[]) || []);
      setCollections((cols as Collection[]) || []);

      if (id) {
        setLoading(true);
        const { data: p } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
        if (p) {
          setForm({
            name: p.name, slug: p.slug, description: p.description || "", short_description: p.short_description || "",
            brand: (p as any).brand || "", tags: (p as any).tags || [], status: (p as any).status || "active",
            is_active: p.is_active, is_featured: p.is_featured, is_new: p.is_new,
            is_bestseller: (p as any).is_bestseller || false, show_on_home: (p as any).show_on_home || false,
            price: p.price, compare_at_price: p.compare_at_price, cost_price: p.cost_price,
            promo_start_date: (p as any).promo_start_date || "", promo_end_date: (p as any).promo_end_date || "",
            max_installments: (p as any).max_installments ?? 12, installments_interest: (p as any).installments_interest || false,
            pix_discount: (p as any).pix_discount || 0,
            wholesale_price: (p as any).wholesale_price, reseller_price: (p as any).reseller_price,
            sku: p.sku || "", barcode: p.barcode || "", stock: p.stock, min_stock_alert: (p as any).min_stock_alert ?? 5,
            track_stock: (p as any).track_stock ?? true, allow_backorder: (p as any).allow_backorder || false,
            stock_location: (p as any).stock_location || "", supplier_id: p.supplier_id,
            product_type: (p as any).product_type || "physical", weight: p.weight,
            height: (p as any).height, width: (p as any).width, length: (p as any).length,
            free_shipping: (p as any).free_shipping || false, extra_prep_days: (p as any).extra_prep_days || 0,
            meta_title: p.meta_title || "", meta_description: p.meta_description || "", og_image_url: (p as any).og_image_url || "",
            hide_price: (p as any).hide_price || false, quote_only: (p as any).quote_only || false,
            is_subscription: (p as any).is_subscription || false,
            related_product_ids: (p as any).related_product_ids || [],
            upsell_product_ids: (p as any).upsell_product_ids || [],
            crosssell_product_ids: (p as any).crosssell_product_ids || [],
          });
        }
        const { data: imgs } = await supabase.from("product_images").select("*").eq("product_id", id).order("sort_order");
        setFormImages((imgs as ProductImage[]) || []);
        const { data: vars } = await supabase.from("product_variants").select("*").eq("product_id", id).order("sort_order");
        setVariants((vars as ProductVariant[]) || []);
        const { data: cats } = await supabase.from("product_categories").select("collection_id, is_primary").eq("product_id", id);
        if (cats) {
          setSelectedCategories(cats.map((c: any) => c.collection_id));
          const primary = cats.find((c: any) => c.is_primary);
          if (primary) setPrimaryCategory((primary as any).collection_id);
        }
        const { data: fields } = await supabase.from("product_custom_fields").select("*").eq("product_id", id).order("sort_order");
        setCustomFields((fields as CustomField[]) || []);
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    if (blockIfDemo()) return;
    if (!form.name) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    const slug = form.slug || generateSlug(form.name);

    const payload: any = {
      name: form.name, slug, description: form.description, short_description: form.short_description,
      brand: form.brand || null, tags: form.tags, status: form.status,
      is_active: form.status === "active", is_featured: form.is_featured, is_new: form.is_new,
      is_bestseller: form.is_bestseller, show_on_home: form.show_on_home,
      price: Number(form.price), compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      promo_start_date: form.promo_start_date || null, promo_end_date: form.promo_end_date || null,
      max_installments: form.max_installments, installments_interest: form.installments_interest,
      pix_discount: form.pix_discount,
      wholesale_price: form.wholesale_price ? Number(form.wholesale_price) : null,
      reseller_price: form.reseller_price ? Number(form.reseller_price) : null,
      sku: form.sku || null, barcode: form.barcode || null, stock: Number(form.stock),
      min_stock_alert: form.min_stock_alert, track_stock: form.track_stock,
      allow_backorder: form.allow_backorder, stock_location: form.stock_location || null,
      supplier_id: form.supplier_id || null,
      product_type: form.product_type, weight: form.weight ? Number(form.weight) : null,
      height: form.height ? Number(form.height) : null, width: form.width ? Number(form.width) : null,
      length: form.length ? Number(form.length) : null,
      free_shipping: form.free_shipping, extra_prep_days: form.extra_prep_days,
      meta_title: form.meta_title || null, meta_description: form.meta_description || null,
      og_image_url: form.og_image_url || null,
      hide_price: form.hide_price, quote_only: form.quote_only, is_subscription: form.is_subscription,
      related_product_ids: form.related_product_ids, upsell_product_ids: form.upsell_product_ids,
      crosssell_product_ids: form.crosssell_product_ids,
    };

    let productId = id;
    if (isEditing) {
      const { error } = await supabase.from("products").update(payload).eq("id", id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setSaving(false); return; }
    } else {
      const { data: newP, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setSaving(false); return; }
      productId = newP.id;
    }

    if (productId) {
      await supabase.from("product_images").delete().eq("product_id", productId);
      if (formImages.length > 0) {
        await supabase.from("product_images").insert(
          formImages.map((img, i) => ({ product_id: productId!, url: img.url, is_primary: img.is_primary, sort_order: i }))
        );
      }
      await supabase.from("product_categories").delete().eq("product_id", productId);
      if (selectedCategories.length > 0) {
        await supabase.from("product_categories").insert(
          selectedCategories.map(cid => ({ product_id: productId!, collection_id: cid, is_primary: cid === primaryCategory }))
        );
      }
      await supabase.from("product_variants").delete().eq("product_id", productId);
      if (variants.length > 0) {
        await supabase.from("product_variants").insert(
          variants.map((v, i) => ({ product_id: productId!, name: v.name, price: v.price, compare_at_price: v.compare_at_price, stock: v.stock, sku: v.sku, sort_order: i, attribute_group: v.attribute_group || null, color_hex: v.color_hex || null }))
        );
      }
      await supabase.from("product_custom_fields").delete().eq("product_id", productId);
      if (customFields.length > 0) {
        await supabase.from("product_custom_fields").insert(
          customFields.map((f, i) => ({ product_id: productId!, field_label: f.field_label, field_type: f.field_type, options: f.options, max_length: f.max_length, is_required: f.is_required, sort_order: i }))
        );
      }
    }

    toast({ title: isEditing ? "Produto atualizado!" : "Produto criado!" });
    setSaving(false);
    navigate("/admin/produtos");
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) { setForm({ ...form, tags: [...form.tags, t] }); setTagInput(""); }
  };

  const removeTag = (tag: string) => setForm({ ...form, tags: form.tags.filter(t => t !== tag) });

  const toggleCategory = (cid: string) => {
    setSelectedCategories(prev => prev.includes(cid) ? prev.filter(c => c !== cid) : [...prev, cid]);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  const activeIndex = tabs.findIndex(t => t.v === activeTab);

  const inputClass = "admin-input h-11";
  const labelClass = "text-[11px] font-bold uppercase tracking-widest text-slate-400";

  const contentAnimation = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.25, ease: "easeOut" as const }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/produtos")} className="rounded-xl h-10 w-10 hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">{isEditing ? "Editar Produto" : "Novo Produto"}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {isEditing ? form.name : "Preencha as informações do produto"}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="admin-btn-primary gap-2 rounded-xl h-10 px-6">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </motion.div>

      {/* Step Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="relative"
      >
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-[2px] bg-border/40 mx-12 hidden md:block" />
        <motion.div
          className="absolute top-5 left-0 h-[2px] bg-accent hidden md:block"
          style={{ marginLeft: "3rem" }}
          initial={{ width: 0 }}
          animate={{ width: `calc(${(activeIndex / (tabs.length - 1)) * 100}% - 6rem)` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />

        <div className="flex items-start justify-between overflow-x-auto pb-2 gap-1 md:gap-0 scrollbar-none">
          {tabs.map((tab, i) => {
            const isActive = activeTab === tab.v;
            const isPast = i < activeIndex;
            const Icon = tab.icon;

            return (
              <button
                key={tab.v}
                onClick={() => setActiveTab(tab.v)}
                className="flex flex-col items-center gap-1.5 min-w-[72px] md:min-w-0 md:flex-1 group relative z-10"
              >
                <motion.div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                      : isPast
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                  }`}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  layout
                >
                  {isPast ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </motion.div>
                <span className={`text-[10px] font-medium transition-colors text-center leading-tight ${
                  isActive ? "text-emerald-600 font-bold" : isPast ? "text-emerald-500/70" : "text-slate-400"
                }`}>
                  {tab.l}
                </span>
                {isActive && tab.hint && (
                  <span className="text-[9px] font-sans text-muted-foreground/70 text-center leading-tight hidden md:block max-w-[80px]">
                    {tab.hint}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTabDot"
                    className="w-1 h-1 rounded-full bg-emerald-500"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} {...contentAnimation}>

          {/* GERAL */}
          {activeTab === "geral" && (
            <div className="admin-card overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="grid gap-2">
                  <Label className={labelClass}>Nome do produto *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: form.slug || generateSlug(e.target.value) })} className={inputClass} placeholder="Ex: Anel Solitário Ouro 18k" />
                  <p className="text-[11px] text-muted-foreground/70 font-sans">Nome exibido na loja e nos resultados de busca</p>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="grid gap-2">
                    <Label className={labelClass}>Descrição curta</Label>
                    <Input value={form.short_description} onChange={e => setForm({ ...form, short_description: e.target.value })} className={inputClass} placeholder="Breve descrição" />
                    <p className="text-[11px] text-muted-foreground/70 font-sans">Resumo exibido nos cards de produto</p>
                  </div>
                  <div className="grid gap-2">
                    <Label className={labelClass}>Marca</Label>
                    <Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className={inputClass} placeholder="Ex: Vivara" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className={labelClass}>Descrição completa</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={5} className="rounded-2xl font-sans text-sm border-border/60 focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all" placeholder="Descrição detalhada do produto" />
                  <p className="text-[11px] text-muted-foreground/70 font-sans">Detalhes completos visíveis na página do produto</p>
                </div>
                <div className="grid gap-2">
                  <Label className={labelClass}>Fornecedor</Label>
                  <Select value={form.supplier_id || "none"} onValueChange={v => setForm({ ...form, supplier_id: v === "none" ? null : v })}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.trade_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Categories */}
                <div className="grid gap-3">
                  <Label className={labelClass}>Categorias</Label>
                  <p className="text-[11px] text-muted-foreground/70 font-sans -mt-1">Organize o produto em coleções para facilitar a navegação</p>
                  <div className="flex flex-wrap gap-2">
                    {collections.map(c => (
                      <motion.button key={c.id} type="button" onClick={() => toggleCategory(c.id)}
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        className={`px-4 py-2 rounded-2xl text-xs font-sans font-medium border transition-all duration-200 ${
                          selectedCategories.includes(c.id)
                            ? "bg-accent text-accent-foreground border-accent shadow-sm"
                            : "bg-muted/40 border-border/50 hover:bg-muted/80 text-foreground/70"
                        }`}>
                        {c.name}
                      </motion.button>
                    ))}
                  </div>
                  {selectedCategories.length > 1 && (
                    <div className="mt-2">
                      <Label className="text-xs text-muted-foreground font-sans">Categoria principal:</Label>
                      <Select value={primaryCategory} onValueChange={setPrimaryCategory}>
                        <SelectTrigger className="h-10 rounded-2xl mt-1"><SelectValue placeholder="Selecione a principal" /></SelectTrigger>
                        <SelectContent>
                          {selectedCategories.map(cid => {
                            const col = collections.find(c => c.id === cid);
                            return col ? <SelectItem key={cid} value={cid}>{col.name}</SelectItem> : null;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="grid gap-2">
                  <Label className={labelClass}>Tags</Label>
                  <div className="flex gap-2">
                    <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} className={`${inputClass} flex-1`} placeholder="Adicionar tag e pressione Enter" />
                    <Button type="button" variant="outline" size="sm" onClick={addTag} className="rounded-2xl h-11 w-11 p-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {form.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1 text-xs font-sans cursor-pointer rounded-xl px-3 py-1 hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => removeTag(tag)}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status & Flags */}
                <div className="grid gap-2">
                  <Label className={labelClass}>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="hidden">Oculto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 bg-muted/30 rounded-2xl p-4">
                  {[
                    { key: "is_new", label: "Novo produto" },
                    { key: "is_featured", label: "Produto destaque" },
                    { key: "is_bestseller", label: "Mais vendido" },
                    { key: "show_on_home", label: "Exibir na home" },
                  ].map(flag => (
                    <div key={flag.key} className="flex items-center gap-2.5">
                      <PremiumToggle3D size="sm" checked={(form as any)[flag.key]} onCheckedChange={v => setForm({ ...form, [flag.key]: v })} />
                      <Label className="font-sans text-sm text-foreground/80">{flag.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MÍDIAS */}
          {activeTab === "midias" && (
            <div className="admin-card overflow-hidden">
              <div className="p-6 md:p-8">
                <ProductImageGallery productId={id || null} images={formImages} onChange={setFormImages} />
              </div>
            </div>
          )}

          {/* PREÇOS */}
          {activeTab === "precos" && (
            <div className="admin-card overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="grid md:grid-cols-3 gap-5">
                  <div className="grid gap-2">
                  <Label className={labelClass}>Preço normal (R$) *</Label>
                    <Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className={inputClass} />
                    <p className="text-[11px] text-muted-foreground/70 font-sans">Valor principal exibido ao cliente</p>
                  </div>
                  <div className="grid gap-2">
                  <Label className={labelClass}>Preço promocional (R$)</Label>
                    <Input type="number" step="0.01" value={form.compare_at_price || ""} onChange={e => setForm({ ...form, compare_at_price: parseFloat(e.target.value) || null })} className={inputClass} />
                    <p className="text-[11px] text-muted-foreground/70 font-sans">Preço "de" riscado (deixe vazio se não houver)</p>
                  </div>
                  <div className="grid gap-2">
                  <Label className={labelClass}>Custo (R$)</Label>
                    <Input type="number" step="0.01" value={form.cost_price || ""} onChange={e => setForm({ ...form, cost_price: parseFloat(e.target.value) || null })} className={inputClass} />
                    <p className="text-[11px] text-muted-foreground/70 font-sans">Para cálculo de margem (não visível ao cliente)</p>
                    {margin && (
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${Number(margin) > 30 ? 'bg-emerald-500' : Number(margin) > 15 ? 'bg-amber-500' : 'bg-destructive'}`} />
                        <span className="text-xs text-muted-foreground font-sans">Margem: <strong>{margin}%</strong></span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="grid gap-2">
                    <Label className={labelClass}>Início promoção</Label>
                    <Input type="datetime-local" value={form.promo_start_date} onChange={e => setForm({ ...form, promo_start_date: e.target.value })} className={inputClass} />
                  </div>
                  <div className="grid gap-2">
                    <Label className={labelClass}>Fim promoção</Label>
                    <Input type="datetime-local" value={form.promo_end_date} onChange={e => setForm({ ...form, promo_end_date: e.target.value })} className={inputClass} />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-5">
                  <div className="grid gap-2">
                    <Label className={labelClass}>Máx. parcelas</Label>
                    <Input type="number" value={form.max_installments} onChange={e => setForm({ ...form, max_installments: parseInt(e.target.value) || 1 })} className={inputClass} />
                  </div>
                  <div className="flex items-center gap-2.5 pt-6">
                    <PremiumToggle3D size="sm" checked={form.installments_interest} onCheckedChange={v => setForm({ ...form, installments_interest: v })} />
                    <Label className="font-sans text-sm">Com juros</Label>
                  </div>
                  <div className="grid gap-2">
                    <Label className={labelClass}>Desconto PIX (%)</Label>
                    <Input type="number" step="0.1" value={form.pix_discount} onChange={e => setForm({ ...form, pix_discount: parseFloat(e.target.value) || 0 })} className={inputClass} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="grid gap-2">
                    <Label className={labelClass}>Preço atacado (R$)</Label>
                    <Input type="number" step="0.01" value={form.wholesale_price || ""} onChange={e => setForm({ ...form, wholesale_price: parseFloat(e.target.value) || null })} className={inputClass} />
                  </div>
                  <div className="grid gap-2">
                    <Label className={labelClass}>Preço revendedor (R$)</Label>
                    <Input type="number" step="0.01" value={form.reseller_price || ""} onChange={e => setForm({ ...form, reseller_price: parseFloat(e.target.value) || null })} className={inputClass} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ESTOQUE */}
          {activeTab === "estoque" && (
            <div className="admin-card overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="grid gap-2">
                    <Label className={labelClass}>SKU</Label>
                    <Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className={inputClass} placeholder="Código interno" />
                  </div>
                  <div className="grid gap-2">
                    <Label className={labelClass}>Código de barras</Label>
                    <Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} className={inputClass} placeholder="EAN / GTIN" />
                  </div>
                </div>
                <div className="bg-muted/30 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <PremiumToggle3D size="sm" checked={form.track_stock} onCheckedChange={v => setForm({ ...form, track_stock: v })} />
                    <Label className="font-sans text-sm">Controlar estoque</Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 font-sans ml-[52px]">Ative para descontar automaticamente a cada venda</p>
                </div>
                {form.track_stock && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid md:grid-cols-3 gap-5">
                    <div className="grid gap-2">
                      <Label className={labelClass}>Quantidade</Label>
                      <Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} className={inputClass} />
                    </div>
                    <div className="grid gap-2">
                      <Label className={labelClass}>Estoque mínimo alerta</Label>
                      <Input type="number" value={form.min_stock_alert} onChange={e => setForm({ ...form, min_stock_alert: parseInt(e.target.value) || 0 })} className={inputClass} />
                    </div>
                    <div className="grid gap-2">
                      <Label className={labelClass}>Localização</Label>
                      <Input value={form.stock_location} onChange={e => setForm({ ...form, stock_location: e.target.value })} className={inputClass} placeholder="Ex: Galpão A" />
                    </div>
                  </motion.div>
                )}
                <div className="bg-muted/30 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <PremiumToggle3D size="sm" checked={form.allow_backorder} onCheckedChange={v => setForm({ ...form, allow_backorder: v })} />
                    <Label className="font-sans text-sm">Permitir vender sem estoque</Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 font-sans ml-[52px]">Aceita pedidos mesmo com estoque zerado</p>
                </div>
                <div className="grid gap-2">
                  <Label className={labelClass}>Fornecedor vinculado</Label>
                  <Select value={form.supplier_id || "none"} onValueChange={v => setForm({ ...form, supplier_id: v === "none" ? null : v })}>
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.trade_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* FRETE */}
          {activeTab === "frete" && (
            <div className="admin-card overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="grid gap-2">
                  <Label className={labelClass}>Tipo de produto</Label>
                  <Select value={form.product_type} onValueChange={v => setForm({ ...form, product_type: v })}>
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Físico</SelectItem>
                      <SelectItem value="digital">Digital</SelectItem>
                      <SelectItem value="service">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.product_type === "physical" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="grid md:grid-cols-4 gap-5">
                      <div className="grid gap-2">
                        <Label className={labelClass}>Peso (kg)</Label>
                        <Input type="number" step="0.01" value={form.weight || ""} onChange={e => setForm({ ...form, weight: parseFloat(e.target.value) || null })} className={inputClass} />
                      </div>
                      <div className="grid gap-2">
                        <Label className={labelClass}>Altura (cm)</Label>
                        <Input type="number" step="0.1" value={form.height || ""} onChange={e => setForm({ ...form, height: parseFloat(e.target.value) || null })} className={inputClass} />
                      </div>
                      <div className="grid gap-2">
                        <Label className={labelClass}>Largura (cm)</Label>
                        <Input type="number" step="0.1" value={form.width || ""} onChange={e => setForm({ ...form, width: parseFloat(e.target.value) || null })} className={inputClass} />
                      </div>
                      <div className="grid gap-2">
                        <Label className={labelClass}>Comprimento (cm)</Label>
                        <Input type="number" step="0.1" value={form.length || ""} onChange={e => setForm({ ...form, length: parseFloat(e.target.value) || null })} className={inputClass} />
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-2xl p-4 space-y-1">
                      <div className="flex items-center gap-2.5">
                        <PremiumToggle3D size="sm" checked={form.free_shipping} onCheckedChange={v => setForm({ ...form, free_shipping: v })} />
                        <Label className="font-sans text-sm">Frete grátis</Label>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 font-sans ml-[52px]">O frete será por conta da loja</p>
                    </div>
                    <div className="grid gap-2 max-w-xs">
                      <Label className={labelClass}>Prazo adicional preparo (dias)</Label>
                      <Input type="number" value={form.extra_prep_days} onChange={e => setForm({ ...form, extra_prep_days: parseInt(e.target.value) || 0 })} className={inputClass} />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* VARIAÇÕES */}
          {activeTab === "variacoes" && (
            <div className="admin-card overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                {/* Template Applier */}
                <VariationTemplateApplier
                  productSku={form.sku}
                  productPrice={form.price}
                  variants={variants}
                  onApply={setVariants}
                />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className={labelClass}>Variações do produto</Label>
                    <p className="text-xs text-muted-foreground mt-1">Tamanhos, cores ou outros atributos</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="rounded-2xl gap-1.5 font-sans text-xs h-10 px-4"
                    onClick={() => setVariants([...variants, { name: "", price: null, compare_at_price: null, stock: 0, sku: null, sort_order: variants.length, color_hex: null }])}>
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </Button>
                </div>
                {variants.length === 0 ? (
                  <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed border-border/60">
                    <Layers className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground font-sans">Nenhuma variação. Produto simples.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {(() => {
                      const groups = new Map<string, { variant: typeof variants[0]; index: number }[]>();
                      variants.forEach((v, i) => {
                        const key = v.attribute_group || "__sem_grupo__";
                        if (!groups.has(key)) groups.set(key, []);
                        groups.get(key)!.push({ variant: v, index: i });
                      });
                      return Array.from(groups.entries()).map(([groupName, items]) => (
                        <div key={groupName} className="space-y-2">
                          {groupName !== "__sem_grupo__" && (
                            <div className="flex items-center gap-2 px-1">
                              <Layers className="w-3.5 h-3.5 text-accent" />
                              <span className="text-xs font-semibold font-sans text-accent uppercase tracking-wider">{groupName}</span>
                              <span className="text-[10px] text-muted-foreground">({items.length})</span>
                              <div className="flex-1 h-px bg-border/40" />
                            </div>
                          )}
                          <div className="space-y-2">
                            {items.map(({ variant: v, index: i }) => (
                              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-end border border-border/40 rounded-2xl p-4 bg-muted/10 hover:bg-muted/20 transition-colors">
                                <div className="grid gap-1.5">
                                  <Label className="text-xs font-sans text-muted-foreground">Nome *</Label>
                                  <Input value={v.name} onChange={e => { const u = [...variants]; u[i].name = e.target.value; setVariants(u); }} className="h-10 rounded-xl text-sm" placeholder="Ex: P / Dourado" />
                                </div>
                                <div className="grid gap-1.5">
                                  <Label className="text-xs font-sans text-muted-foreground">Cor</Label>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="color"
                                      value={v.color_hex || "#000000"}
                                      onChange={e => { const u = [...variants]; u[i].color_hex = e.target.value; setVariants(u); }}
                                      className="w-10 h-10 rounded-xl border border-border cursor-pointer p-0.5"
                                    />
                                    {v.color_hex && (
                                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => { const u = [...variants]; u[i].color_hex = null; setVariants(u); }}>
                                        ×
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div className="grid gap-1.5">
                                  <Label className="text-xs font-sans text-muted-foreground">Preço</Label>
                                  <Input type="number" step="0.01" value={v.price || ""} onChange={e => { const u = [...variants]; u[i].price = parseFloat(e.target.value) || null; setVariants(u); }} className="h-10 rounded-xl text-sm w-24" />
                                </div>
                                <div className="grid gap-1.5">
                                  <Label className="text-xs font-sans text-muted-foreground">Estoque</Label>
                                  <Input type="number" value={v.stock} onChange={e => { const u = [...variants]; u[i].stock = parseInt(e.target.value) || 0; setVariants(u); }} className="h-10 rounded-xl text-sm w-20" />
                                </div>
                                <div className="grid gap-1.5">
                                  <Label className="text-xs font-sans text-muted-foreground">SKU</Label>
                                  <Input value={v.sku || ""} onChange={e => { const u = [...variants]; u[i].sku = e.target.value || null; setVariants(u); }} className="h-10 rounded-xl text-sm w-28" />
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => setVariants(variants.filter((_, j) => j !== i))}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEO */}
          {activeTab === "seo" && (
            <div className="admin-card overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="grid gap-2">
                  <Label className={labelClass}>Slug (URL)</Label>
                  <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className={inputClass} placeholder="slug-do-produto" />
                </div>
                <div className="grid gap-2">
                  <Label className={labelClass}>Meta título</Label>
                  <Input value={form.meta_title} onChange={e => setForm({ ...form, meta_title: e.target.value })} className={inputClass} maxLength={60} placeholder="Título para buscadores (máx. 60 chars)" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-sans">{form.meta_title.length}/60</span>
                    <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(form.meta_title.length / 60) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className={labelClass}>Meta descrição</Label>
                  <Textarea value={form.meta_description} onChange={e => setForm({ ...form, meta_description: e.target.value })} rows={3} className="rounded-2xl font-sans text-sm border-border/60 focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all" maxLength={160} placeholder="Descrição para buscadores (máx. 160 chars)" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-sans">{form.meta_description.length}/160</span>
                    <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(form.meta_description.length / 160) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className={labelClass}>Imagem social (OG Image)</Label>
                  <ImageUpload value={form.og_image_url} onChange={(url) => setForm({ ...form, og_image_url: url })} folder="seo" label="Enviar imagem social" />
                </div>
                {/* Google Preview */}
                <div className="border border-border/40 rounded-2xl p-5 bg-muted/20 space-y-1.5">
                  <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider font-bold mb-3">Preview Google</p>
                  <p className="text-sm text-primary font-sans font-medium">{form.meta_title || form.name || "Título do produto"}</p>
                  <p className="text-xs text-accent font-sans">sualoja.com.br/produto/{form.slug || "slug"}</p>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">{form.meta_description || form.short_description || "Descrição do produto..."}</p>
                </div>
              </div>
            </div>
          )}

          {/* PERSONALIZAÇÃO */}
          {activeTab === "personalizacao" && (
            <div className="admin-card overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className={labelClass}>Campos extras para o cliente</Label>
                    <p className="text-xs text-muted-foreground mt-1">Gravações, medidas, etc.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="rounded-2xl gap-1.5 font-sans text-xs h-10 px-4"
                    onClick={() => setCustomFields([...customFields, { field_label: "", field_type: "text", options: [], max_length: null, is_required: false, sort_order: customFields.length }])}>
                    <Plus className="w-3.5 h-3.5" /> Adicionar campo
                  </Button>
                </div>
                {customFields.length === 0 ? (
                  <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed border-border/60">
                    <Wrench className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground font-sans">Nenhum campo personalizado.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customFields.map((f, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="border border-border/40 rounded-2xl p-4 grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-end bg-muted/10 hover:bg-muted/20 transition-colors">
                        <div className="grid gap-1.5">
                          <Label className="text-xs font-sans text-muted-foreground">Label</Label>
                          <Input value={f.field_label} onChange={e => { const u = [...customFields]; u[i].field_label = e.target.value; setCustomFields(u); }} className="h-10 rounded-xl text-sm" placeholder="Ex: Gravação" />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs font-sans text-muted-foreground">Tipo</Label>
                          <Select value={f.field_type} onValueChange={v => { const u = [...customFields]; u[i].field_type = v; setCustomFields(u); }}>
                            <SelectTrigger className="h-10 rounded-xl text-sm w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="select">Escolha</SelectItem>
                              <SelectItem value="upload">Upload</SelectItem>
                              <SelectItem value="textarea">Observação</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs font-sans text-muted-foreground">Máx. chars</Label>
                          <Input type="number" value={f.max_length || ""} onChange={e => { const u = [...customFields]; u[i].max_length = parseInt(e.target.value) || null; setCustomFields(u); }} className="h-10 rounded-xl text-sm w-20" />
                        </div>
                        <div className="flex items-center gap-1.5 pb-0.5">
                          <PremiumToggle3D size="sm" checked={f.is_required} onCheckedChange={v => { const u = [...customFields]; u[i].is_required = v; setCustomFields(u); }} />
                          <Label className="text-xs font-sans">Obrigatório</Label>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => setCustomFields(customFields.filter((_, j) => j !== i))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AVANÇADO */}
          {activeTab === "avancado" && (
            <div className="admin-card overflow-hidden">
              <div className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 bg-muted/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2.5">
                    <PremiumToggle3D size="sm" checked={form.hide_price} onCheckedChange={v => setForm({ ...form, hide_price: v })} />
                    <Label className="font-sans text-sm text-foreground/80">Esconder preço</Label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <PremiumToggle3D size="sm" checked={form.quote_only} onCheckedChange={v => setForm({ ...form, quote_only: v })} />
                    <Label className="font-sans text-sm text-foreground/80">Somente orçamento</Label>
                  </div>
                </div>
                <div className="bg-muted/20 rounded-2xl p-5 border border-border/30">
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Produtos relacionados, upsell e cross-sell podem ser configurados após salvar o produto, vinculando outros itens do catálogo.
                  </p>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Bottom navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between pt-2"
      >
        <Button
          variant="outline"
          className="rounded-2xl h-11 px-5 font-sans text-sm"
          disabled={activeIndex === 0}
          onClick={() => setActiveTab(tabs[activeIndex - 1]?.v || "geral")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
        </Button>
        <span className="text-xs text-muted-foreground font-sans">
          {activeIndex + 1} / {tabs.length}
        </span>
        {activeIndex < tabs.length - 1 ? (
          <Button
            className="rounded-2xl h-11 px-5 font-sans text-sm"
            onClick={() => setActiveTab(tabs[activeIndex + 1].v)}
          >
            Próximo <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving} className="rounded-2xl h-11 px-6 font-sans font-semibold shadow-premium gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Produto
          </Button>
        )}
      </motion.div>
    </div>
  );
}
