import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumToggle3D } from "@/components/ui/premium-toggle-3d";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/store/ImageUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Image, Eye, EyeOff, GripVertical } from "lucide-react";
import { useIsDemo } from "@/hooks/useIsDemo";

interface PromoPanel {
  id: string;
  image_url: string;
  alt_text: string;
  link: string | null;
  sort_order: number;
  is_active: boolean;
  title: string;
  subtitle: string;
  cta_text: string;
  bg_image_url: string | null;
  gradient: string;
}

const GRADIENT_OPTIONS = [
  { value: "from-gray-900 via-gray-800 to-gray-900", label: "Cinza Escuro" },
  { value: "from-sport-orange/90 via-sport-orange to-red-600", label: "Laranja / Vermelho" },
  { value: "from-gray-800 via-gray-700 to-gray-900", label: "Cinza Médio" },
  { value: "from-blue-900 via-blue-800 to-blue-950", label: "Azul Escuro" },
  { value: "from-emerald-800 via-emerald-700 to-emerald-900", label: "Verde Esmeralda" },
  { value: "from-purple-900 via-purple-800 to-purple-950", label: "Roxo" },
  { value: "from-rose-800 via-rose-700 to-rose-900", label: "Rosa" },
];

const emptyForm = {
  image_url: "",
  alt_text: "",
  link: "",
  sort_order: 0,
  is_active: true,
  title: "",
  subtitle: "",
  cta_text: "",
  bg_image_url: "",
  gradient: "from-gray-900 via-gray-800 to-gray-900",
};

export default function AdminPromoPanels() {
  const { blockIfDemo } = useIsDemo();
  const [panels, setPanels] = useState<PromoPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPanels = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("promo_panels")
      .select("*")
      .order("sort_order");
    setPanels((data as PromoPanel[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPanels(); }, []);

  const handleSave = async () => {
    if (blockIfDemo()) return;
    if (!form.title) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      image_url: form.image_url || "placeholder",
      alt_text: form.alt_text || form.title,
      link: form.link || null,
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
      title: form.title,
      subtitle: form.subtitle,
      cta_text: form.cta_text,
      bg_image_url: form.bg_image_url || null,
      gradient: form.gradient,
    };

    if (editingId) {
      const { error } = await supabase.from("promo_panels").update(payload).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Painel atualizado!" });
    } else {
      const { error } = await supabase.from("promo_panels").insert(payload);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Painel criado!" });
    }
    setSaving(false);
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchPanels();
  };

  const handleEdit = (p: PromoPanel) => {
    setEditingId(p.id);
    setForm({
      image_url: p.image_url || "",
      alt_text: p.alt_text,
      link: p.link || "",
      sort_order: p.sort_order,
      is_active: p.is_active,
      title: p.title || "",
      subtitle: p.subtitle || "",
      cta_text: p.cta_text || "",
      bg_image_url: p.bg_image_url || "",
      gradient: p.gradient || "from-gray-900 via-gray-800 to-gray-900",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (blockIfDemo()) return;
    await supabase.from("promo_panels").delete().eq("id", id);
    toast({ title: "Painel removido" });
    fetchPanels();
  };

  const toggleActive = async (p: PromoPanel) => {
    await supabase.from("promo_panels").update({ is_active: !p.is_active }).eq("id", p.id);
    fetchPanels();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painéis Promocionais</h1>
          <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>
            Gerencie os painéis promocionais exibidos na home (título, subtítulo, CTA e imagem de fundo)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Novo Painel
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {editingId ? "Editar Painel" : "Novo Painel"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="font-sans text-sm">Título *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="h-10 rounded-xl"
                    placeholder="Ex: ACESSÓRIOS CERTOS"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="font-sans text-sm">Subtítulo</Label>
                  <Input
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    className="h-10 rounded-xl"
                    placeholder="Ex: TREINO SEM LIMITES"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="font-sans text-sm">Texto do Botão (CTA)</Label>
                  <Input
                    value={form.cta_text}
                    onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                    className="h-10 rounded-xl"
                    placeholder="Ex: APROVEITE!"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="font-sans text-sm">Link (opcional)</Label>
                  <Input
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                    className="h-10 rounded-xl"
                    placeholder="/produtos ou https://..."
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="font-sans text-sm">Gradiente de fundo</Label>
                <Select value={form.gradient} onValueChange={(v) => setForm({ ...form, gradient: v })}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADIENT_OPTIONS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Preview */}
                <div className={`h-8 rounded-lg bg-gradient-to-br ${form.gradient} border border-border`} />
              </div>

              <div className="grid gap-2">
                <Label className="font-sans text-sm">Imagem de Fundo (opcional, substitui gradiente)</Label>
                <ImageUpload
                  value={form.bg_image_url}
                  onChange={(v) => setForm({ ...form, bg_image_url: v })}
                  folder="promo-panels"
                  label="Upload Imagem de Fundo"
                />
              </div>

              <div className="grid gap-2">
                <Label className="font-sans text-sm">Imagem decorativa (mascote/ícone)</Label>
                <ImageUpload
                  value={form.image_url}
                  onChange={(v) => setForm({ ...form, image_url: v })}
                  folder="promo-panels"
                  label="Upload Imagem Decorativa"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="font-sans text-sm">Ordem</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <PremiumToggle3D size="sm" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label className="font-sans text-sm">Ativo</Label>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="h-11 rounded-xl shine font-sans w-full">
                {saving ? "Salvando..." : editingId ? "Salvar" : "Criar Painel"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : panels.length === 0 ? (
        <div className="admin-card">
          <div className="flex flex-col items-center justify-center py-16" style={{ color: `hsl(var(--admin-text-secondary))` }}>
            <Image className="w-12 h-12 mb-4 opacity-40" />
            <p className="text-lg">Nenhum painel configurado</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {panels.map((p) => (
            <div key={p.id} className="admin-card overflow-hidden">
              <div className="p-0">
                <div className="flex flex-col sm:flex-row">
                  <div className={`w-full sm:w-56 h-28 sm:h-auto shrink-0 relative overflow-hidden bg-gradient-to-br ${p.gradient}`}>
                    {p.bg_image_url && (
                      <img src={p.bg_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    {p.image_url && p.image_url !== "placeholder" && (
                      <img src={p.image_url} alt={p.alt_text} className="absolute right-0 bottom-0 h-[80%] opacity-30 object-contain" />
                    )}
                    <div className="relative z-10 p-3">
                      <p className="font-display text-xs font-black text-white leading-tight">{p.title}</p>
                      <p className="font-display text-xs font-black text-accent italic">{p.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex-1 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-display font-bold text-sm">{p.title || p.alt_text || "Sem título"}</h3>
                        <Badge variant={p.is_active ? "default" : "secondary"} className="text-[10px]">
                          {p.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-sans">
                        CTA: {p.cta_text || "—"} · {p.link ? `Link: ${p.link}` : "Sem link"} · Ordem: {p.sort_order}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => toggleActive(p)}>
                        {p.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleEdit(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
