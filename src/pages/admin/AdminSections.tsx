import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumToggle3D } from "@/components/ui/premium-toggle-3d";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Image } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsDemo } from "@/hooks/useIsDemo";

interface Section {
  id: string;
  section_type: string;
  title: string | null;
  config: any;
  sort_order: number;
  is_active: boolean;
}

const sectionTypes = [
  { value: "hero", label: "Hero Banner" },
  { value: "featured_products", label: "Produtos em Destaque" },
  { value: "featured_collections", label: "Coleções" },
  { value: "benefits", label: "Benefícios" },
  { value: "newsletter", label: "Newsletter" },
];

interface FormState {
  section_type: string;
  title: string;
  sort_order: number;
  is_active: boolean;
  // Hero fields
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_cta_link: string;
  hero_image_url: string;
  // Products fields
  limit: number;
  filter: string;
  // Newsletter fields
  newsletter_title: string;
  newsletter_subtitle: string;
}

const emptyForm: FormState = {
  section_type: "hero",
  title: "",
  sort_order: 0,
  is_active: true,
  hero_title: "",
  hero_subtitle: "",
  hero_cta_text: "CONFERIR",
  hero_cta_link: "/colecoes",
  hero_image_url: "",
  limit: 8,
  filter: "featured",
  newsletter_title: "",
  newsletter_subtitle: "",
};

function configToForm(section_type: string, config: any): Partial<FormState> {
  if (!config) return {};
  switch (section_type) {
    case "hero":
      return {
        hero_title: config.title || "",
        hero_subtitle: config.subtitle || "",
        hero_cta_text: config.cta_text || "CONFERIR",
        hero_cta_link: config.cta_link || "/colecoes",
        hero_image_url: config.image_url || "",
      };
    case "featured_products":
      return {
        limit: config.limit || 8,
        filter: config.filter || "featured",
      };
    case "newsletter":
      return {
        newsletter_title: config.title || "",
        newsletter_subtitle: config.subtitle || "",
      };
    default:
      return {};
  }
}

function formToConfig(form: FormState): any {
  switch (form.section_type) {
    case "hero":
      return {
        title: form.hero_title || undefined,
        subtitle: form.hero_subtitle || undefined,
        cta_text: form.hero_cta_text || undefined,
        cta_link: form.hero_cta_link || undefined,
        image_url: form.hero_image_url || undefined,
      };
    case "featured_products":
      return { limit: form.limit, filter: form.filter };
    case "newsletter":
      return {
        title: form.newsletter_title || undefined,
        subtitle: form.newsletter_subtitle || undefined,
      };
    default:
      return {};
  }
}

export default function AdminSections() {
  const { blockIfDemo } = useIsDemo();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchSections = async () => {
    setLoading(true);
    const { data } = await supabase.from("home_sections").select("*").order("sort_order");
    setSections((data as Section[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSections(); }, []);

  const handleSave = async () => {
    if (blockIfDemo()) return;
    setSaving(true);
    const config = formToConfig(form);
    const payload = {
      section_type: form.section_type,
      title: form.title || null,
      config,
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    };

    if (editingId) {
      const { error } = await supabase.from("home_sections").update(payload).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Seção atualizada!" });
    } else {
      const { error } = await supabase.from("home_sections").insert(payload);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Seção criada!" });
    }

    setSaving(false);
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchSections();
  };

  const handleEdit = (s: Section) => {
    setEditingId(s.id);
    const configFields = configToForm(s.section_type, s.config);
    setForm({
      ...emptyForm,
      section_type: s.section_type,
      title: s.title || "",
      sort_order: s.sort_order,
      is_active: s.is_active,
      ...configFields,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (blockIfDemo()) return;
    const { error } = await supabase.from("home_sections").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Seção removida" }); fetchSections(); }
  };

  const renderConfigFields = () => {
    switch (form.section_type) {
      case "hero":
        return (
          <>
            <div className="grid gap-2">
              <Label className="font-sans text-sm font-medium">Título do Banner</Label>
              <Input value={form.hero_title} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} className="h-11 rounded-xl" placeholder="Nova coleção disponível" />
            </div>
            <div className="grid gap-2">
              <Label className="font-sans text-sm font-medium">Subtítulo</Label>
              <Input value={form.hero_subtitle} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} className="h-11 rounded-xl" placeholder="Qualidade e confiança em cada compra." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-sans text-sm font-medium">Texto do Botão</Label>
                <Input value={form.hero_cta_text} onChange={(e) => setForm({ ...form, hero_cta_text: e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label className="font-sans text-sm font-medium">Link do Botão</Label>
                <Input value={form.hero_cta_link} onChange={(e) => setForm({ ...form, hero_cta_link: e.target.value })} className="h-11 rounded-xl" placeholder="/colecoes" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="font-sans text-sm font-medium">URL da Imagem (opcional)</Label>
              <Input value={form.hero_image_url} onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })} className="h-11 rounded-xl" placeholder="https://..." />
            </div>
          </>
        );
      case "featured_products":
        return (
          <>
            <div className="grid gap-2">
              <Label className="font-sans text-sm font-medium">Quantidade de Produtos</Label>
              <Input type="number" value={form.limit} onChange={(e) => setForm({ ...form, limit: parseInt(e.target.value) || 8 })} className="h-11 rounded-xl" min={1} max={20} />
            </div>
            <div className="grid gap-2">
              <Label className="font-sans text-sm font-medium">Filtro</Label>
              <Select value={form.filter} onValueChange={(v) => setForm({ ...form, filter: v })}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Em Destaque</SelectItem>
                  <SelectItem value="new">Novidades</SelectItem>
                  <SelectItem value="bestsellers">Mais Vendidos</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      case "newsletter":
        return (
          <>
            <div className="grid gap-2">
              <Label className="font-sans text-sm font-medium">Título da Newsletter</Label>
              <Input value={form.newsletter_title} onChange={(e) => setForm({ ...form, newsletter_title: e.target.value })} className="h-11 rounded-xl" placeholder="Fique por dentro" />
            </div>
            <div className="grid gap-2">
              <Label className="font-sans text-sm font-medium">Subtítulo</Label>
              <Input value={form.newsletter_subtitle} onChange={(e) => setForm({ ...form, newsletter_subtitle: e.target.value })} className="h-11 rounded-xl" placeholder="Receba ofertas exclusivas" />
            </div>
          </>
        );
      case "featured_collections":
      case "benefits":
        return (
          <p className="text-sm text-muted-foreground font-sans py-2">
            Esta seção não possui configurações adicionais. Basta ativar e definir a ordem.
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seções da Home</h1>
          <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Configure as seções da página inicial</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"><Plus className="w-4 h-4" /> Nova Seção</button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{editingId ? "Editar Seção" : "Nova Seção"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label className="font-sans text-sm font-medium">Tipo</Label>
                <Select value={form.section_type} onValueChange={(v) => setForm({ ...emptyForm, section_type: v, title: form.title, sort_order: form.sort_order, is_active: form.is_active })}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sectionTypes.map((t) => <SelectItem key={t.value} value={t.value} className="font-sans">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="font-sans text-sm font-medium">Título da Seção (opcional)</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 rounded-xl" placeholder="Ex: Destaques da Semana" />
              </div>

              {/* Dynamic config fields based on section type */}
              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wider">Configurações</p>
                {renderConfigFields()}
              </div>

              <div className="grid gap-2">
                <Label className="font-sans text-sm font-medium">Ordem</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="h-11 rounded-xl" />
              </div>
              <div className="flex items-center gap-2">
                <PremiumToggle3D size="sm" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label className="font-sans text-sm">Ativa</Label>
              </div>
              <Button onClick={handleSave} disabled={saving} className="h-11 rounded-xl shine font-sans">
                {saving ? "Salvando..." : editingId ? "Salvar" : "Criar seção"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Image className="w-12 h-12 mb-4 opacity-40" />
              <p className="font-sans text-lg">Nenhuma seção configurada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-sans w-12">#</TableHead>
                  <TableHead className="font-sans">Tipo</TableHead>
                  <TableHead className="font-sans">Título</TableHead>
                  <TableHead className="font-sans">Status</TableHead>
                  <TableHead className="font-sans text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-sans text-muted-foreground">{s.sort_order}</TableCell>
                    <TableCell className="font-sans font-medium">
                      {sectionTypes.find((t) => t.value === s.section_type)?.label || s.section_type}
                    </TableCell>
                    <TableCell className="font-sans text-sm text-muted-foreground">{s.title || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs font-sans">
                        {s.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleEdit(s)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </Table>
          )}
        </div>
      </div>
    </div>
  );
}
