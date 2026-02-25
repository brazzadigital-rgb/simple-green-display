import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PremiumToggle3D } from "@/components/ui/premium-toggle-3d";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FolderOpen, ImageIcon, Search } from "lucide-react";
import { useIsDemo } from "@/hooks/useIsDemo";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/store/ImageUpload";
import { motion } from "framer-motion";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  banner_url: string | null;
  is_active: boolean;
  sort_order: number;
}

const emptyCollection = { name: "", slug: "", description: "", image_url: "", banner_url: "", is_active: true, sort_order: 0 };

export default function Collections() {
  const { blockIfDemo } = useIsDemo();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCollection);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchCollections = async () => {
    setLoading(true);
    const { data } = await supabase.from("collections").select("*").order("sort_order");
    setCollections((data as Collection[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCollections(); }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleSave = async () => {
    if (blockIfDemo()) return;
    if (!form.name) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    setSaving(true);
    const slug = form.slug || generateSlug(form.name);
    const payload = { ...form, slug };

    if (editingId) {
      const { error } = await supabase.from("collections").update(payload).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Coleção atualizada!" });
    } else {
      const { error } = await supabase.from("collections").insert(payload);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Coleção criada!" });
    }

    setSaving(false);
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyCollection);
    fetchCollections();
  };

  const handleEdit = (c: Collection) => {
    setEditingId(c.id);
    setForm({ name: c.name, slug: c.slug, description: c.description || "", image_url: c.image_url || "", banner_url: (c as any).banner_url || "", is_active: c.is_active, sort_order: c.sort_order });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (blockIfDemo()) return;
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Coleção removida" }); fetchCollections(); }
  };

  const filtered = collections.filter(c => {
    if (!search.trim()) return true;
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coleções</h1>
          <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Organize seus produtos em categorias</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm(emptyCollection); } }}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Nova Coleção
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg">{editingId ? "Editar Coleção" : "Nova Coleção"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} className="h-10 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="h-10 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Imagem (ícone/categoria)</Label>
                <ImageUpload value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} folder="collections" label="Enviar imagem" />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Banner do Mosaico</Label>
                <p className="text-xs -mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Imagem grande para o template Mosaico (recomendado: 800×600px ou maior)</p>
                <ImageUpload value={form.banner_url} onChange={(url) => setForm({ ...form, banner_url: url })} folder="collections" label="Enviar banner" />
              </div>
              <div className="flex items-center gap-2">
                <PremiumToggle3D size="sm" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label className="text-sm">Ativa</Label>
              </div>
              <Button onClick={handleSave} disabled={saving} className="h-11 rounded-xl w-full">
                {saving ? "Salvando..." : editingId ? "Salvar" : "Criar coleção"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="admin-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `hsl(var(--admin-text-secondary))` }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar coleção..." className="pl-9 h-10 rounded-xl border-0 bg-muted/30 text-sm" />
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FolderOpen className="w-12 h-12 mb-4" style={{ color: `hsl(var(--admin-text-secondary) / 0.3)` }} />
            <p className="text-base font-medium" style={{ color: `hsl(var(--admin-text-secondary))` }}>Nenhuma coleção encontrada</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent" style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                    {["Imagem", "Nome", "Slug", "Banner", "Status", ""].map(h => (
                      <TableHead key={h} className={`text-[11px] uppercase tracking-wider font-semibold ${h === "" ? "text-right" : ""} ${h === "Imagem" ? "w-14" : ""}`} style={{ color: `hsl(var(--admin-text-secondary))` }}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="transition-colors" style={{ borderBottom: `1px solid hsl(var(--admin-border-subtle))` }}>
                      <TableCell className="py-3">
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} className="w-10 h-10 rounded-lg object-cover" style={{ border: `1px solid hsl(var(--admin-border))` }} />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium py-3.5">{c.name}</TableCell>
                      <TableCell className="text-sm py-3.5" style={{ color: `hsl(var(--admin-text-secondary))` }}>{c.slug}</TableCell>
                      <TableCell className="py-3.5">
                        {c.banner_url ? (
                          <span className="admin-status-pill admin-status-info text-[10px]">
                            <ImageIcon className="w-3 h-3 mr-1" /> Configurado
                          </span>
                        ) : (
                          <span className="admin-status-pill text-[10px]" style={{ background: `hsl(var(--muted))`, color: `hsl(var(--admin-text-secondary))` }}>
                            Sem banner
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className={`admin-status-pill text-[10px] ${c.is_active ? "admin-status-success" : "admin-status-danger"}`}>
                          {c.is_active ? "Ativa" : "Inativa"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="sm:hidden divide-y" style={{ borderColor: `hsl(var(--admin-border-subtle))` }}>
              {filtered.map((c) => (
                <div key={c.id} className="p-4 flex items-center gap-3">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" style={{ border: `1px solid hsl(var(--admin-border))` }} />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[11px]" style={{ color: `hsl(var(--admin-text-secondary))` }}>{c.slug}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`admin-status-pill text-[10px] ${c.is_active ? "admin-status-success" : "admin-status-danger"}`}>
                      {c.is_active ? "Ativa" : "Inativa"}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleEdit(c)}><Pencil className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
