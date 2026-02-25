import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PremiumToggle3D } from "@/components/ui/premium-toggle-3d";
import { toast } from "@/hooks/use-toast";
import { Layers, Wand2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

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

interface Props {
  productSku: string;
  productPrice: number;
  variants: ProductVariant[];
  onApply: (variants: ProductVariant[]) => void;
}

const fetchTemplates = async () => {
  const { data: templates } = await supabase
    .from("variation_templates")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name");
  if (!templates) return [];

  const { data: attrs } = await supabase
    .from("variation_template_attributes")
    .select("*")
    .in("template_id", templates.map(t => t.id))
    .order("sort_order");

  const attrIds = (attrs || []).map(a => a.id);
  const { data: vals } = attrIds.length > 0
    ? await supabase.from("variation_template_values").select("*").in("template_attribute_id", attrIds).order("sort_order")
    : { data: [] };

  return templates.map(t => ({
    ...t,
    attributes: (attrs || []).filter(a => a.template_id === t.id).map(a => ({
      ...a,
      values: (vals || []).filter((v: any) => v.template_attribute_id === a.id),
    })),
  }));
};

export function VariationTemplateApplier({ productSku, productPrice, variants, onApply }: Props) {
  const { data: templates = [], isLoading } = useQuery({ queryKey: ["variation-templates"], queryFn: fetchTemplates });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [applying, setApplying] = useState(false);

  const toggleTemplate = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleApply = () => {
    if (selectedIds.length === 0) {
      toast({ title: "Selecione ao menos um template", variant: "destructive" });
      return;
    }
    setApplying(true);

    const selected = templates.filter(t => selectedIds.includes(t.id));

    // Collect all attribute values from selected templates
    const allAttrValues = selected.flatMap(t => t.attributes.map(a => ({
      attrName: a.attribute_name,
      values: a.values,
    })));

    // Create variants — one per value, preserving attribute group
    const newVariants: ProductVariant[] = [];
    for (const attr of allAttrValues) {
      for (let i = 0; i < attr.values.length; i++) {
        const val = attr.values[i];
        const skuSuffix = val.sku_suffix || "";
        const priceDelta = val.price_delta || 0;
        newVariants.push({
          name: val.value_label,
          price: priceDelta > 0 ? productPrice + priceDelta : null,
          compare_at_price: null,
          stock: 0,
          sku: productSku ? `${productSku}${skuSuffix}` : skuSuffix.replace(/^-/, "") || null,
          sort_order: newVariants.length,
          attribute_group: attr.attrName,
          color_hex: val.color_hex || null,
        });
      }
    }

    if (overwrite) {
      onApply(newVariants);
    } else {
      onApply([...variants, ...newVariants]);
    }

    setApplying(false);
    setSelectedIds([]);
    toast({ title: `${newVariants.length} variações geradas!`, description: `A partir de ${selectedIds.length} template(s)` });
  };

  if (isLoading) return null;
  if (templates.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-accent/5 border border-accent/20 rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <Wand2 className="w-4 h-4 text-accent" />
        <Label className="font-sans text-xs font-semibold text-accent uppercase tracking-wider">
          Aplicar template de variações
        </Label>
      </div>

      <div className="flex flex-wrap gap-2">
        {templates.map(t => {
          const isSelected = selectedIds.includes(t.id);
          const attrCount = t.attributes.reduce((s: number, a: any) => s + a.values.length, 0);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTemplate(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans font-medium transition-all border ${
                isSelected
                  ? "bg-accent text-accent-foreground border-accent shadow-sm"
                  : "bg-background border-border/40 text-muted-foreground hover:border-accent/40 hover:text-accent"
              }`}
            >
              <Layers className="w-3 h-3" />
              {t.name}
              <span className="text-[10px] opacity-70">({attrCount})</span>
              {t.is_default && <span className="text-[9px] uppercase tracking-wider opacity-60">★</span>}
            </button>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5">
            <PremiumToggle3D size="sm" checked={overwrite} onCheckedChange={setOverwrite} />
            <span className="text-xs font-sans text-muted-foreground">Sobrescrever variações existentes</span>
          </div>
          <Button type="button" size="sm" className="rounded-xl gap-1.5 h-9 px-4 font-sans text-xs font-semibold shadow-sm" onClick={handleApply} disabled={applying}>
            {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            Aplicar ({selectedIds.length})
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
