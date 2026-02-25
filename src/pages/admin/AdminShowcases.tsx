import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumToggle3D } from "@/components/ui/premium-toggle-3d";
import { ImageUpload } from "@/components/store/ImageUpload";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Calendar, Eye, Sparkles, Clock, Tag
} from "lucide-react";
import { format } from "date-fns";
import { useIsDemo } from "@/hooks/useIsDemo";

interface Showcase {
  id: string;
  name: string;
  slug: string;
  status: string;
  priority: number;
  starts_at: string;
  ends_at: string;
  section_title: string | null;
  section_subtitle: string | null;
  enable_countdown: boolean;
  enable_campaign_badge: boolean;
  badge_text: string | null;
  badge_color: string | null;
  badge_position: string | null;
  enable_promo_strip: boolean;
  promo_strip_text: string | null;
  banner_desktop_url: string | null;
  banner_mobile_url: string | null;
  banner_link: string | null;
  banner_overlay_opacity: number | null;
  banner_text_position: string | null;
  banner_clean_mode: boolean;
  created_at: string;
}

interface Collection {
  id: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
}

interface ShowcaseCollection {
  collection_id: string;
  sort_order: number;
  card_size: string;
}

const emptyForm = {
  name: "",
  slug: "",
  status: "draft" as string,
  priority: 0,
  starts_at: "",
  ends_at: "",
  section_title: "",
  section_subtitle: "",
  enable_countdown: false,
  enable_campaign_badge: false,
  badge_text: "",
  badge_color: "accent",
  badge_position: "top-left",
  enable_promo_strip: false,
  promo_strip_text: "",
  banner_desktop_url: "",
  banner_mobile_url: "",
  banner_link: "",
  banner_overlay_opacity: 0,
  banner_text_position: "center",
  banner_clean_mode: false,
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendado",
  active: "Ativo",
  ended: "Encerrado",
};
const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  scheduled: "outline",
  active: "default",
  ended: "destructive",
};

export default function AdminShowcases() {
  const { blockIfDemo } = useIsDemo();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<ShowcaseCollection[]>([]);
  const [step, setStep] = useState(1); // 1 = info, 2 = collections, 3 = visual

  const { data: showcases = [], isLoading } = useQuery({
    queryKey: ["admin-showcases"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seasonal_showcases")
        .select("*")
        .order("priority", { ascending: false });
      return (data || []) as Showcase[];
    },
  });

  const { data: allCollections = [] } = useQuery({
    queryKey: ["all-collections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("collections")
        .select("id, name, image_url, is_active")
        .eq("is_active", true)
        .order("name");
      return (data || []) as Collection[];
    },
  });

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSave = async () => {
    if (blockIfDemo()) return;
    if (!form.name || !form.starts_at || !form.ends_at) {
      toast.error("Preencha nome, data início e fim.");
      return;
    }
    setSaving(true);

    const payload: any = {
      ...form,
      slug: form.slug || generateSlug(form.name),
      section_title: form.section_title || null,
      section_subtitle: form.section_subtitle || null,
      badge_text: form.badge_text || null,
      promo_strip_text: form.promo_strip_text || null,
      banner_desktop_url: form.banner_desktop_url || null,
      banner_mobile_url: form.banner_mobile_url || null,
      banner_link: form.banner_link || null,
    };

    try {
      let showcaseId = editingId;

      if (editingId) {
        await supabase.from("seasonal_showcases").update(payload).eq("id", editingId);
      } else {
        const { data } = await supabase.from("seasonal_showcases").insert(payload).select("id").single();
        showcaseId = data?.id || null;
      }

      if (showcaseId) {
        // Replace collections
        await supabase.from("showcase_collections").delete().eq("showcase_id", showcaseId);
        if (selectedCollections.length > 0) {
          await supabase.from("showcase_collections").insert(
            selectedCollections.map((sc, i) => ({
              showcase_id: showcaseId!,
              collection_id: sc.collection_id,
              sort_order: i,
              card_size: sc.card_size,
            }))
          );
        }
      }

      toast.success(editingId ? "Vitrine atualizada!" : "Vitrine criada!");
      queryClient.invalidateQueries({ queryKey: ["admin-showcases"] });
      queryClient.invalidateQueries({ queryKey: ["active-showcase"] });
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error("Erro ao salvar vitrine.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSelectedCollections([]);
    setStep(1);
  };

  const handleEdit = async (s: Showcase) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      slug: s.slug,
      status: s.status,
      priority: s.priority,
      starts_at: s.starts_at ? s.starts_at.slice(0, 16) : "",
      ends_at: s.ends_at ? s.ends_at.slice(0, 16) : "",
      section_title: s.section_title || "",
      section_subtitle: s.section_subtitle || "",
      enable_countdown: s.enable_countdown,
      enable_campaign_badge: s.enable_campaign_badge,
      badge_text: s.badge_text || "",
      badge_color: s.badge_color || "accent",
      badge_position: s.badge_position || "top-left",
      enable_promo_strip: s.enable_promo_strip,
      promo_strip_text: s.promo_strip_text || "",
      banner_desktop_url: s.banner_desktop_url || "",
      banner_mobile_url: s.banner_mobile_url || "",
      banner_link: s.banner_link || "",
      banner_overlay_opacity: s.banner_overlay_opacity || 0,
      banner_text_position: s.banner_text_position || "center",
      banner_clean_mode: s.banner_clean_mode,
    });

    // Load existing collections
    const { data } = await supabase
      .from("showcase_collections")
      .select("collection_id, sort_order, card_size")
      .eq("showcase_id", s.id)
      .order("sort_order");
    setSelectedCollections((data || []) as ShowcaseCollection[]);
    setStep(1);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (blockIfDemo()) return;
    await supabase.from("seasonal_showcases").delete().eq("id", id);
    toast.success("Vitrine removida.");
    queryClient.invalidateQueries({ queryKey: ["admin-showcases"] });
  };

  const toggleCollection = (colId: string) => {
    setSelectedCollections((prev) => {
      const exists = prev.find((sc) => sc.collection_id === colId);
      if (exists) return prev.filter((sc) => sc.collection_id !== colId);
      if (prev.length >= 8) { toast.error("Máximo de 8 coleções."); return prev; }
      return [...prev, { collection_id: colId, sort_order: prev.length, card_size: "medium" }];
    });
  };

  const updateCardSize = (colId: string, size: string) => {
    setSelectedCollections((prev) =>
      prev.map((sc) => (sc.collection_id === colId ? { ...sc, card_size: size } : sc))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vitrines & Temporadas</h1>
          <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>
            Controle automático de campanhas sazonais na Home
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /> Nova Vitrine</button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {editingId ? "Editar Vitrine" : "Nova Vitrine"}
              </DialogTitle>
            </DialogHeader>

            {/* Step tabs */}
            <div className="flex gap-2 mb-4">
              {[
                { n: 1, label: "Informações", icon: Calendar },
                { n: 2, label: "Coleções", icon: Sparkles },
                { n: 3, label: "Visual", icon: Eye },
              ].map((s) => (
                <Button
                  key={s.n}
                  variant={step === s.n ? "default" : "outline"}
                  size="sm"
                  className="flex-1 font-sans text-xs gap-1.5"
                  onClick={() => setStep(s.n)}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </Button>
              ))}
            </div>

            {/* Step 1: Info */}
            {step === 1 && (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label className="font-sans text-sm">Nome da campanha *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })}
                    placeholder="Ex: Dia das Mães 2026"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="font-sans text-sm">Início *</Label>
                    <Input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-sans text-sm">Fim *</Label>
                    <Input
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="font-sans text-sm">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="scheduled">Agendado</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="ended">Encerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-sans text-sm">Prioridade</Label>
                    <Input
                      type="number"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                      className="h-10 rounded-xl"
                    />
                    <p className="text-[10px] text-muted-foreground">Maior número = maior prioridade</p>
                  </div>
                </div>
                <Button onClick={() => setStep(2)} className="font-sans mt-2">Próximo: Coleções →</Button>
              </div>
            )}

            {/* Step 2: Collections */}
            {step === 2 && (
              <div className="grid gap-4">
                <p className="text-sm text-muted-foreground font-sans">
                  Selecione até 8 coleções para o mosaico ({selectedCollections.length}/8)
                </p>
                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                  {allCollections.map((col) => {
                    const selected = selectedCollections.find((sc) => sc.collection_id === col.id);
                    return (
                      <div
                        key={col.id}
                        className={`relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
                          selected ? "border-accent bg-accent/5" : "border-border hover:border-accent/30"
                        }`}
                        onClick={() => toggleCollection(col.id)}
                      >
                        <div className="flex items-center gap-3">
                          {col.image_url ? (
                            <img src={col.image_url} alt={col.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted" />
                          )}
                          <span className="font-sans text-sm font-medium">{col.name}</span>
                        </div>
                        {selected && (
                          <div className="mt-2">
                            <Select
                              value={selected.card_size}
                              onValueChange={(v) => { updateCardSize(col.id, v); }}
                            >
                              <SelectTrigger className="h-8 text-xs rounded-lg" onClick={(e) => e.stopPropagation()}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="large">Grande</SelectItem>
                                <SelectItem value="medium">Médio</SelectItem>
                                <SelectItem value="small">Pequeno</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 font-sans">← Voltar</Button>
                  <Button onClick={() => setStep(3)} className="flex-1 font-sans">Próximo: Visual →</Button>
                </div>
              </div>
            )}

            {/* Step 3: Visual */}
            {step === 3 && (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label className="font-sans text-sm">Título da seção</Label>
                  <Input
                    value={form.section_title}
                    onChange={(e) => setForm({ ...form, section_title: e.target.value })}
                    placeholder="Ex: Presentes para quem você ama"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="font-sans text-sm">Subtítulo</Label>
                  <Input
                    value={form.section_subtitle}
                    onChange={(e) => setForm({ ...form, section_subtitle: e.target.value })}
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <PremiumToggle3D size="sm" checked={form.enable_countdown} onCheckedChange={(v) => setForm({ ...form, enable_countdown: v })} />
                    <Label className="font-sans text-sm">Contagem regressiva</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <PremiumToggle3D size="sm" checked={form.enable_campaign_badge} onCheckedChange={(v) => setForm({ ...form, enable_campaign_badge: v })} />
                    <Label className="font-sans text-sm">Selo nos produtos</Label>
                  </div>
                </div>

                {form.enable_campaign_badge && (
                  <div className="grid gap-2">
                    <Label className="font-sans text-sm">Texto do selo</Label>
                    <Input
                      value={form.badge_text}
                      onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                      placeholder="Ex: Especial Dia das Mães"
                      className="h-10 rounded-xl"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <PremiumToggle3D size="sm" checked={form.enable_promo_strip} onCheckedChange={(v) => setForm({ ...form, enable_promo_strip: v })} />
                  <Label className="font-sans text-sm">Faixa promocional no header</Label>
                </div>
                {form.enable_promo_strip && (
                  <Input
                    value={form.promo_strip_text}
                    onChange={(e) => setForm({ ...form, promo_strip_text: e.target.value })}
                    placeholder="Ex: 🎁 Frete grátis para presentes!"
                    className="h-10 rounded-xl"
                  />
                )}

                <div className="border-t pt-4 mt-2">
                  <h4 className="font-sans font-semibold text-sm mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Banner da Temporada
                  </h4>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label className="font-sans text-xs">Banner Desktop</Label>
                      <ImageUpload
                        value={form.banner_desktop_url}
                        onChange={(url) => setForm({ ...form, banner_desktop_url: url })}
                        folder="showcases"
                        label="Enviar desktop"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-sans text-xs">Banner Mobile</Label>
                      <ImageUpload
                        value={form.banner_mobile_url}
                        onChange={(url) => setForm({ ...form, banner_mobile_url: url })}
                        folder="showcases"
                        label="Enviar mobile"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-sans text-xs">Link do banner</Label>
                      <Input
                        value={form.banner_link}
                        onChange={(e) => setForm({ ...form, banner_link: e.target.value })}
                        placeholder="/ofertas"
                        className="h-9 rounded-xl text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <PremiumToggle3D size="sm" checked={form.banner_clean_mode} onCheckedChange={(v) => setForm({ ...form, banner_clean_mode: v })} />
                      <Label className="font-sans text-xs">Modo clean (sem texto)</Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 font-sans">← Voltar</Button>
                  <Button onClick={handleSave} disabled={saving} className="flex-1 font-sans">
                    {saving ? "Salvando..." : editingId ? "Salvar" : "Criar Vitrine"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      <div className="admin-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : showcases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Calendar className="w-12 h-12 mb-4 opacity-40" />
              <p className="font-sans text-lg">Nenhuma vitrine cadastrada</p>
              <p className="font-sans text-sm mt-1">Crie campanhas sazonais para automatizar sua Home</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-sans">Campanha</TableHead>
                  <TableHead className="font-sans">Período</TableHead>
                  <TableHead className="font-sans">Prioridade</TableHead>
                  <TableHead className="font-sans">Status</TableHead>
                  <TableHead className="font-sans text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {showcases.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-sans font-medium">{s.name}</TableCell>
                    <TableCell className="font-sans text-sm text-muted-foreground">
                      {format(new Date(s.starts_at), "dd/MM/yy HH:mm")} → {format(new Date(s.ends_at), "dd/MM/yy HH:mm")}
                    </TableCell>
                    <TableCell className="font-sans">{s.priority}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[s.status] || "secondary"} className="text-xs font-sans">
                        {statusLabels[s.status] || s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleEdit(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </div>
    </div>
  );
}
