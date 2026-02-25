import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Loader2, Layers, Copy, Star, StarOff, Pencil, X, Save, GripVertical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsDemo } from "@/hooks/useIsDemo";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface TemplateValue {
  id?: string;
  value_label: string;
  value_code: string;
  color_hex: string;
  price_delta: number;
  sku_suffix: string;
  sort_order: number;
}

interface TemplateAttribute {
  id?: string;
  attribute_name: string;
  input_type: string;
  sort_order: number;
  values: TemplateValue[];
}

interface Template {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  created_at: string;
  attributes: TemplateAttribute[];
}

const inputTypes = [
  { value: "select", label: "Select" },
  { value: "button", label: "Botões" },
  { value: "color", label: "Color Swatches" },
  { value: "dropdown", label: "Dropdown" },
];

const fetchTemplates = async (): Promise<Template[]> => {
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
    ? await supabase
        .from("variation_template_values")
        .select("*")
        .in("template_attribute_id", attrIds)
        .order("sort_order")
    : { data: [] };

  return templates.map(t => ({
    ...t,
    description: t.description || "",
    attributes: (attrs || [])
      .filter(a => a.template_id === t.id)
      .map(a => ({
        ...a,
        values: (vals || [])
          .filter((v: any) => v.template_attribute_id === a.id)
          .map((v: any) => ({
            id: v.id,
            value_label: v.value_label,
            value_code: v.value_code || "",
            color_hex: v.color_hex || "",
            price_delta: v.price_delta || 0,
            sku_suffix: v.sku_suffix || "",
            sort_order: v.sort_order,
          })),
      })),
  }));
};

const emptyAttribute = (): TemplateAttribute => ({
  attribute_name: "",
  input_type: "select",
  sort_order: 0,
  values: [],
});

const emptyValue = (sort: number): TemplateValue => ({
  value_label: "",
  value_code: "",
  color_hex: "",
  price_delta: 0,
  sku_suffix: "",
  sort_order: sort,
});

export default function AdminVariationTemplates() {
  const { blockIfDemo } = useIsDemo();
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({ queryKey: ["variation-templates"], queryFn: fetchTemplates });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAttrs, setFormAttrs] = useState<TemplateAttribute[]>([emptyAttribute()]);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditing(null);
    setFormName("");
    setFormDesc("");
    setFormAttrs([emptyAttribute()]);
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setFormName(t.name);
    setFormDesc(t.description);
    setFormAttrs(t.attributes.length > 0 ? t.attributes : [emptyAttribute()]);
    setDialogOpen(true);
  };

  const handleDuplicate = async (t: Template) => {
    const { data: newT } = await supabase.from("variation_templates")
      .insert({ name: t.name + " (Cópia)", description: t.description, is_default: false })
      .select("id").single();
    if (!newT) return;
    for (const attr of t.attributes) {
      const { data: newA } = await supabase.from("variation_template_attributes")
        .insert({ template_id: newT.id, attribute_name: attr.attribute_name, input_type: attr.input_type, sort_order: attr.sort_order })
        .select("id").single();
      if (newA && attr.values.length > 0) {
        await supabase.from("variation_template_values").insert(
          attr.values.map(v => ({ template_attribute_id: newA.id, value_label: v.value_label, value_code: v.value_code || null, color_hex: v.color_hex || null, price_delta: v.price_delta, sku_suffix: v.sku_suffix || null, sort_order: v.sort_order }))
        );
      }
    }
    qc.invalidateQueries({ queryKey: ["variation-templates"] });
    toast({ title: "Template duplicado!" });
  };

  const handleDelete = async (id: string) => {
    if (blockIfDemo()) return;
    await supabase.from("variation_templates").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["variation-templates"] });
    toast({ title: "Template excluído" });
  };

  const handleToggleDefault = async (t: Template) => {
    if (!t.is_default) {
      // Remove default from others
      await supabase.from("variation_templates").update({ is_default: false }).neq("id", t.id);
    }
    await supabase.from("variation_templates").update({ is_default: !t.is_default }).eq("id", t.id);
    qc.invalidateQueries({ queryKey: ["variation-templates"] });
  };

  const handleSave = async () => {
    if (blockIfDemo()) return;
    if (!formName.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);

    let templateId = editing?.id;

    if (editing) {
      await supabase.from("variation_templates").update({ name: formName, description: formDesc }).eq("id", editing.id);
      // Delete old attrs (cascade deletes values)
      await supabase.from("variation_template_attributes").delete().eq("template_id", editing.id);
    } else {
      const { data } = await supabase.from("variation_templates")
        .insert({ name: formName, description: formDesc })
        .select("id").single();
      templateId = data?.id;
    }

    if (templateId) {
      for (const attr of formAttrs) {
        if (!attr.attribute_name.trim()) continue;
        const { data: newA } = await supabase.from("variation_template_attributes")
          .insert({ template_id: templateId, attribute_name: attr.attribute_name, input_type: attr.input_type, sort_order: attr.sort_order })
          .select("id").single();
        if (newA) {
          const validValues = attr.values.filter(v => v.value_label.trim());
          if (validValues.length > 0) {
            await supabase.from("variation_template_values").insert(
              validValues.map((v, i) => ({
                template_attribute_id: newA.id, value_label: v.value_label, value_code: v.value_code || null,
                color_hex: v.color_hex || null, price_delta: v.price_delta || 0, sku_suffix: v.sku_suffix || null, sort_order: i,
              }))
            );
          }
        }
      }
    }

    setSaving(false);
    setDialogOpen(false);
    qc.invalidateQueries({ queryKey: ["variation-templates"] });
    toast({ title: editing ? "Template atualizado!" : "Template criado!" });
  };

  const updateAttr = (idx: number, key: keyof TemplateAttribute, value: any) => {
    const copy = [...formAttrs];
    (copy[idx] as any)[key] = value;
    setFormAttrs(copy);
  };

  const addValue = (attrIdx: number) => {
    const copy = [...formAttrs];
    copy[attrIdx].values.push(emptyValue(copy[attrIdx].values.length));
    setFormAttrs(copy);
  };

  const updateValue = (attrIdx: number, valIdx: number, key: keyof TemplateValue, value: any) => {
    const copy = [...formAttrs];
    (copy[attrIdx].values[valIdx] as any)[key] = value;
    setFormAttrs(copy);
  };

  const removeValue = (attrIdx: number, valIdx: number) => {
    const copy = [...formAttrs];
    copy[attrIdx].values.splice(valIdx, 1);
    setFormAttrs(copy);
  };

  const inputClass = "h-10 rounded-xl font-sans text-sm border-border/60 bg-background";
  const labelClass = "font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wider";

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Templates de Variações</h1>
          <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Modelos prontos de variações para agilizar o cadastro de produtos</p>
        </div>
        <Button onClick={openNew} className="gap-2 rounded-2xl h-11 px-5 font-sans font-semibold shadow-premium">
          <Plus className="w-4 h-4" /> Novo Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Layers className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-sans text-sm">Nenhum template encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="border border-border/40 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-base truncate">{t.name}</h3>
                        {t.is_default && <Badge variant="secondary" className="text-[10px] font-sans uppercase tracking-wider bg-accent/10 text-accent border-accent/20">Padrão</Badge>}
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground font-sans mb-3">{t.description}</p>}
                      <div className="flex flex-wrap gap-2">
                        {t.attributes.map(a => (
                          <div key={a.id} className="bg-muted/40 rounded-xl px-3 py-1.5">
                            <span className="text-xs font-sans font-semibold text-foreground/80">{a.attribute_name}</span>
                            <span className="text-[10px] text-muted-foreground ml-1.5">({a.values.length} opções)</span>
                          </div>
                        ))}
                      </div>
                      {t.attributes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {t.attributes.flatMap(a => a.values.slice(0, 6)).map((v, vi) => (
                            <span key={vi} className="inline-flex items-center gap-1 bg-background border border-border/40 rounded-lg px-2 py-0.5 text-[11px] font-sans text-muted-foreground">
                              {v.color_hex && <span className="w-3 h-3 rounded-full border border-border/40 shrink-0" style={{ backgroundColor: v.color_hex }} />}
                              {v.value_label}
                              {v.price_delta > 0 && <span className="text-accent">+R${v.price_delta}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => handleToggleDefault(t)} title={t.is_default ? "Remover padrão" : "Definir como padrão"}>
                        {t.is_default ? <Star className="w-4 h-4 text-accent fill-accent" /> : <StarOff className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => handleDuplicate(t)}><Copy className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive/60 hover:text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{editing ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className={labelClass}>Nome do template *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} className={inputClass} placeholder='Ex: "Anéis (Aro)"' />
              </div>
              <div className="grid gap-1.5">
                <Label className={labelClass}>Descrição</Label>
                <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} className={inputClass} placeholder="Descrição breve" />
              </div>
            </div>

            {/* Attributes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className={labelClass}>Atributos</Label>
                <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs h-8"
                  onClick={() => setFormAttrs([...formAttrs, { ...emptyAttribute(), sort_order: formAttrs.length }])}>
                  <Plus className="w-3 h-3" /> Atributo
                </Button>
              </div>

              {formAttrs.map((attr, ai) => (
                <Card key={ai} className="border border-border/40 rounded-xl overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-end gap-3">
                      <div className="flex-1 grid gap-1.5">
                        <Label className="text-xs font-sans text-muted-foreground">Nome do atributo</Label>
                        <Input value={attr.attribute_name} onChange={e => updateAttr(ai, "attribute_name", e.target.value)} className={inputClass} placeholder='Ex: "Tamanho"' />
                      </div>
                      <div className="w-40 grid gap-1.5">
                        <Label className="text-xs font-sans text-muted-foreground">Tipo</Label>
                        <Select value={attr.input_type} onValueChange={v => updateAttr(ai, "input_type", v)}>
                          <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {inputTypes.map(it => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {formAttrs.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive/60 hover:text-destructive shrink-0"
                          onClick={() => setFormAttrs(formAttrs.filter((_, j) => j !== ai))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Values */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-sans text-muted-foreground uppercase tracking-wider">Valores</Label>
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 rounded-lg" onClick={() => addValue(ai)}>
                          <Plus className="w-3 h-3" /> Valor
                        </Button>
                      </div>
                      {attr.values.map((val, vi) => (
                        <div key={vi} className="flex items-center gap-2 bg-muted/20 rounded-lg p-2">
                          <Input value={val.value_label} onChange={e => updateValue(ai, vi, "value_label", e.target.value)} className="h-8 rounded-lg text-xs flex-1" placeholder="Label" />
                          {attr.input_type === "color" && (
                            <input type="color" value={val.color_hex || "#D6B25E"} onChange={e => updateValue(ai, vi, "color_hex", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                          )}
                          <Input value={val.sku_suffix} onChange={e => updateValue(ai, vi, "sku_suffix", e.target.value)} className="h-8 rounded-lg text-xs w-24" placeholder="SKU sufixo" />
                          <Input type="number" step="0.01" value={val.price_delta || ""} onChange={e => updateValue(ai, vi, "price_delta", parseFloat(e.target.value) || 0)} className="h-8 rounded-lg text-xs w-20" placeholder="+R$" />
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive/50 hover:text-destructive shrink-0" onClick={() => removeValue(ai, vi)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
