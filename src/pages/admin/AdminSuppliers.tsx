import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Truck, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface Supplier {
  id: string; trade_name: string; legal_name: string | null; document: string | null;
  email: string | null; phone: string | null; whatsapp: string | null; contact_person: string | null;
  status: string; shipping_days: number | null; notes: string | null; created_at: string;
}

const emptyForm = {
  trade_name: "", legal_name: "", document: "", email: "", phone: "", whatsapp: "",
  contact_person: "", status: "active", shipping_days: 0, notes: "",
};

export default function AdminSuppliers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, shipping_days: Number(form.shipping_days) || 0 };
      if (editing) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-suppliers"] });
      setDialogOpen(false); setEditing(null); setForm(emptyForm);
      toast({ title: editing ? "Fornecedor atualizado" : "Fornecedor criado" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-suppliers"] }); toast({ title: "Fornecedor removido" }); },
  });

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      trade_name: s.trade_name, legal_name: s.legal_name || "", document: s.document || "",
      email: s.email || "", phone: s.phone || "", whatsapp: s.whatsapp || "",
      contact_person: s.contact_person || "", status: s.status, shipping_days: s.shipping_days || 0, notes: s.notes || "",
    });
    setDialogOpen(true);
  };

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };

  const filtered = suppliers.filter(s =>
    s.trade_name.toLowerCase().includes(search.toLowerCase()) || (s.document || "").includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Gerencie seus fornecedores e parceiros</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Novo Fornecedor
        </button>
      </div>

      <div className="admin-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `hsl(var(--admin-text-secondary))` }} />
          <Input placeholder="Buscar por nome ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl border-0 bg-muted/30 text-sm" />
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: `hsl(var(--admin-text-secondary))` }}>Fornecedor</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold hidden md:table-cell" style={{ color: `hsl(var(--admin-text-secondary))` }}>CNPJ/CPF</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold hidden lg:table-cell" style={{ color: `hsl(var(--admin-text-secondary))` }}>Contato</th>
                  <th className="text-center px-4 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: `hsl(var(--admin-text-secondary))` }}>Status</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-semibold hidden md:table-cell" style={{ color: `hsl(var(--admin-text-secondary))` }}>Prazo</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: `hsl(var(--admin-text-secondary))` }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-12" style={{ color: `hsl(var(--admin-text-secondary))` }}>Carregando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12" style={{ color: `hsl(var(--admin-text-secondary))` }}>
                    <Truck className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    Nenhum fornecedor encontrado
                  </td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="transition-colors hover:bg-muted/20" style={{ borderBottom: `1px solid hsl(var(--admin-border-subtle))` }}>
                    <td className="px-4 py-3.5 font-medium">{s.trade_name}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell" style={{ color: `hsl(var(--admin-text-secondary))` }}>{s.document || "—"}</td>
                    <td className="px-4 py-3.5 hidden lg:table-cell" style={{ color: `hsl(var(--admin-text-secondary))` }}>{s.email || s.phone || "—"}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`admin-status-pill text-[10px] ${s.status === "active" ? "admin-status-success" : "admin-status-danger"}`}>
                        {s.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden md:table-cell" style={{ color: `hsl(var(--admin-text-secondary))` }}>{s.shipping_days ? `${s.shipping_days}d` : "—"}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="rounded-lg w-8 h-8" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="rounded-lg w-8 h-8 text-destructive" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg font-bold">{editing ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            <p className="text-xs text-muted-foreground">Preencha os dados do fornecedor abaixo</p>
          </DialogHeader>
          <div className="grid gap-5 px-6 pb-6 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome Fantasia *</Label>
              <Input value={form.trade_name} onChange={e => setForm(f => ({ ...f, trade_name: e.target.value }))} placeholder="Ex: Joias Premium Ltda" className="rounded-xl border border-border bg-background h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Razão Social</Label>
              <Input value={form.legal_name} onChange={e => setForm(f => ({ ...f, legal_name: e.target.value }))} placeholder="Razão social completa" className="rounded-xl border border-border bg-background h-11" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CNPJ/CPF</Label>
                <Input value={form.document} onChange={e => setForm(f => ({ ...f, document: e.target.value }))} placeholder="00.000.000/0001-00" className="rounded-xl border border-border bg-background h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@empresa.com" className="rounded-xl border border-border bg-background h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 0000-0000" className="rounded-xl border border-border bg-background h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp</Label>
                <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="(00) 90000-0000" className="rounded-xl border border-border bg-background h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato Responsável</Label>
                <Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} placeholder="Nome do responsável" className="rounded-xl border border-border bg-background h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prazo Envio (dias)</Label>
                <Input type="number" value={form.shipping_days} onChange={e => setForm(f => ({ ...f, shipping_days: Number(e.target.value) }))} placeholder="0" className="rounded-xl border border-border bg-background h-11" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="rounded-xl border border-border bg-background h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Notas internas sobre o fornecedor..." className="rounded-xl border border-border bg-background" />
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.trade_name || saveMutation.isPending} className="rounded-xl h-11 mt-1 font-semibold">
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
