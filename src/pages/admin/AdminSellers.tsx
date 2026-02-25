import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Search, UserCheck, Pencil, Trash2, Copy, CheckCircle, XCircle,
  Ban, Eye, MessageCircle, Clock, ShieldCheck, ShieldX
} from "lucide-react";
import { toast as toastFn } from "@/hooks/use-toast";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface Seller {
  id: string; name: string; email: string; phone: string | null; document: string | null;
  status: string; monthly_goal: number; commission_rate: number; referral_code: string | null;
  user_id: string | null; created_at: string; seller_status: string;
  whatsapp: string | null; city: string | null; state: string | null;
  instagram: string | null; experience_level: string | null; source: string | null;
  notes: string | null; approved_at: string | null; approved_by_admin_id: string | null;
  rejection_reason: string | null;
}

const emptyForm = { name: "", email: "", phone: "", document: "", status: "active", monthly_goal: 0, commission_rate: 0 };

export default function AdminSellers() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pending");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Seller | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [detailSeller, setDetailSeller] = useState<Seller | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectSellerId, setRejectSellerId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sellers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Seller[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, monthly_goal: Number(form.monthly_goal), commission_rate: Number(form.commission_rate) };
      if (editing) {
        const { error } = await supabase.from("sellers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sellers").insert({ ...payload, seller_status: "approved" } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
      setDialogOpen(false); setEditing(null); setForm(emptyForm);
      toast({ title: editing ? "Vendedor atualizado" : "Vendedor criado" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sellers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-sellers"] }); toast({ title: "Vendedor removido" }); },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, seller_status, rejection_reason: reason, userId }: { id: string; seller_status: string; rejection_reason?: string; userId?: string | null }) => {
      const updatePayload: any = { seller_status };
      if (seller_status === "approved") {
        updatePayload.approved_at = new Date().toISOString();
        updatePayload.approved_by_admin_id = user?.id;
      }
      if (reason) updatePayload.rejection_reason = reason;

      const { error } = await supabase.from("sellers").update(updatePayload).eq("id", id);
      if (error) throw error;

      // Notify the seller
      if (userId) {
        const title = seller_status === "approved" ? "Cadastro aprovado ✅" : seller_status === "rejected" ? "Cadastro reprovado ❌" : "Conta bloqueada ⛔";
        const body = seller_status === "approved"
          ? "Seu cadastro como vendedor foi aprovado! Acesse o painel do vendedor."
          : seller_status === "rejected"
          ? `Seu cadastro como vendedor foi reprovado. ${reason ? `Motivo: ${reason}` : ""}`
          : "Sua conta de vendedor foi bloqueada pelo administrador.";

        await supabase.from("notifications").insert({
          recipient_type: "customer",
          recipient_user_id: userId,
          title,
          body,
          type: seller_status === "approved" ? "seller_approved" : "seller_rejected",
          entity_type: "seller",
          entity_id: id,
          priority: "high",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
      setRejectDialogOpen(false);
      setRejectionReason("");
      toast({ title: "Status atualizado" });
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const openEdit = (s: Seller) => {
    setEditing(s);
    setForm({ name: s.name, email: s.email, phone: s.phone || "", document: s.document || "", status: s.status, monthly_goal: s.monthly_goal, commission_rate: s.commission_rate });
    setDialogOpen(true);
  };

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };

  const statusMap: Record<string, string[]> = {
    pending: ["pending"],
    approved: ["approved"],
    blocked: ["rejected", "blocked"],
  };

  const filtered = sellers.filter(s => {
    const matchesTab = (statusMap[tab] || []).includes(s.seller_status);
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const counts = {
    pending: sellers.filter(s => s.seller_status === "pending").length,
    approved: sellers.filter(s => s.seller_status === "approved").length,
    blocked: sellers.filter(s => s.seller_status === "rejected" || s.seller_status === "blocked").length,
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");
  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "admin-status-warning" },
      approved: { label: "Aprovado", className: "admin-status-success" },
      rejected: { label: "Reprovado", className: "admin-status-danger" },
      blocked: { label: "Bloqueado", className: "admin-status-danger" },
    };
    const s = map[status] || { label: status, className: "" };
    return <span className={`admin-status-pill text-[10px] ${s.className}`}>{s.label}</span>;
  };

  const expLabel = (v: string | null) => {
    if (!v) return "—";
    const m: Record<string, string> = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };
    return m[v] || v;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendedores</h1>
          <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Gerencie vendedores e aprovações</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Novo Vendedor
        </button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/30 rounded-xl p-1">
          <TabsTrigger value="pending" className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-background">
            <Clock className="w-3.5 h-3.5" /> Pendentes
            {counts.pending > 0 && <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">{counts.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-background">
            <ShieldCheck className="w-3.5 h-3.5" /> Aprovados
            <span className="ml-1 text-[10px] text-muted-foreground">{counts.approved}</span>
          </TabsTrigger>
          <TabsTrigger value="blocked" className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-background">
            <ShieldX className="w-3.5 h-3.5" /> Reprovados/Bloqueados
            <span className="ml-1 text-[10px] text-muted-foreground">{counts.blocked}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="admin-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `hsl(var(--admin-text-secondary))` }} />
          <Input placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl border-0 bg-muted/30 text-sm" />
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: `hsl(var(--admin-text-secondary))` }}>Vendedor</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold hidden md:table-cell" style={{ color: `hsl(var(--admin-text-secondary))` }}>Email</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold hidden lg:table-cell" style={{ color: `hsl(var(--admin-text-secondary))` }}>WhatsApp</th>
                  <th className="text-center px-4 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: `hsl(var(--admin-text-secondary))` }}>Status</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold hidden lg:table-cell" style={{ color: `hsl(var(--admin-text-secondary))` }}>Cadastro</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: `hsl(var(--admin-text-secondary))` }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12" style={{ color: `hsl(var(--admin-text-secondary))` }}>
                    <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    Nenhum vendedor encontrado
                  </td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="transition-colors hover:bg-muted/20" style={{ borderBottom: `1px solid hsl(var(--admin-border-subtle))` }}>
                    <td className="px-4 py-3.5 font-medium">{s.name}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell" style={{ color: `hsl(var(--admin-text-secondary))` }}>{s.email}</td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {s.whatsapp ? (
                        <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs hover:text-primary transition-colors" style={{ color: `hsl(var(--admin-text-secondary))` }}>
                          <MessageCircle className="w-3.5 h-3.5" /> {s.whatsapp}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-center">{statusBadge(s.seller_status)}</td>
                    <td className="px-4 py-3.5 hidden lg:table-cell" style={{ color: `hsl(var(--admin-text-secondary))` }}>{formatDate(s.created_at)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="rounded-lg w-8 h-8" onClick={() => setDetailSeller(s)} title="Ver detalhes">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {s.seller_status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" className="rounded-lg w-8 h-8 text-green-600" onClick={() => updateStatusMutation.mutate({ id: s.id, seller_status: "approved", userId: s.user_id })} title="Aprovar">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-lg w-8 h-8 text-destructive" onClick={() => { setRejectSellerId(s.id); setRejectDialogOpen(true); }} title="Reprovar">
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {s.seller_status === "approved" && (
                          <>
                            <Button variant="ghost" size="icon" className="rounded-lg w-8 h-8" onClick={() => openEdit(s)} title="Editar">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-lg w-8 h-8 text-destructive" onClick={() => updateStatusMutation.mutate({ id: s.id, seller_status: "blocked", userId: s.user_id })} title="Bloquear">
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {(s.seller_status === "rejected" || s.seller_status === "blocked") && (
                          <Button variant="ghost" size="icon" className="rounded-lg w-8 h-8 text-green-600" onClick={() => updateStatusMutation.mutate({ id: s.id, seller_status: "approved", userId: s.user_id })} title="Reativar">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="rounded-lg w-8 h-8 text-destructive" onClick={() => deleteMutation.mutate(s.id)} title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Detail Sheet */}
      <Sheet open={!!detailSeller} onOpenChange={() => setDetailSeller(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold">Detalhes do Vendedor</SheetTitle>
          </SheetHeader>
          {detailSeller && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {detailSeller.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{detailSeller.name}</p>
                  {statusBadge(detailSeller.seller_status)}
                </div>
              </div>

              <div className="grid gap-3 text-sm">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Email</span>
                  <span>{detailSeller.email}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">WhatsApp</span>
                  <span>{detailSeller.whatsapp || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">CPF</span>
                  <span>{detailSeller.document || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Cidade/Estado</span>
                  <span>{detailSeller.city && detailSeller.state ? `${detailSeller.city}/${detailSeller.state}` : "—"}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Instagram</span>
                  <span>{detailSeller.instagram || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Experiência</span>
                  <span>{expLabel(detailSeller.experience_level)}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Origem</span>
                  <span className="capitalize">{detailSeller.source || "—"}</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Cadastro</span>
                  <span>{formatDate(detailSeller.created_at)}</span>
                </div>
                {detailSeller.approved_at && (
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Aprovado em</span>
                    <span>{formatDate(detailSeller.approved_at)}</span>
                  </div>
                )}
                {detailSeller.rejection_reason && (
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Motivo rejeição</span>
                    <span className="text-destructive text-right max-w-[200px]">{detailSeller.rejection_reason}</span>
                  </div>
                )}
                {detailSeller.referral_code && (
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Código referral</span>
                    <button onClick={() => { navigator.clipboard.writeText(detailSeller.referral_code!); toastFn({ title: "Copiado!" }); }}
                      className="flex items-center gap-1 font-mono text-xs hover:text-primary">
                      <Copy className="w-3 h-3" /> {detailSeller.referral_code}
                    </button>
                  </div>
                )}
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Comissão</span>
                  <span>{detailSeller.commission_rate}%</span>
                </div>
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Meta mensal</span>
                  <span>{formatCurrency(detailSeller.monthly_goal)}</span>
                </div>
              </div>

              {detailSeller.notes && (
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1 font-semibold">Observações</p>
                  <p className="text-sm">{detailSeller.notes}</p>
                </div>
              )}

              {/* Quick actions */}
              <div className="flex gap-2 pt-4">
                {detailSeller.seller_status === "pending" && (
                  <>
                    <Button size="sm" className="flex-1 rounded-xl gap-1" onClick={() => { updateStatusMutation.mutate({ id: detailSeller.id, seller_status: "approved", userId: detailSeller.user_id }); setDetailSeller(null); }}>
                      <CheckCircle className="w-4 h-4" /> Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 rounded-xl gap-1" onClick={() => { setRejectSellerId(detailSeller.id); setRejectDialogOpen(true); setDetailSeller(null); }}>
                      <XCircle className="w-4 h-4" /> Reprovar
                    </Button>
                  </>
                )}
                {detailSeller.whatsapp && (
                  <Button size="sm" variant="outline" className="rounded-xl gap-1" asChild>
                    <a href={`https://wa.me/${detailSeller.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Reprovar Vendedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Motivo da reprovação</Label>
              <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Informe o motivo..." className="mt-1.5 rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="flex-1 rounded-xl">Cancelar</Button>
              <Button variant="destructive" onClick={() => {
                if (rejectSellerId) {
                  const seller = sellers.find(s => s.id === rejectSellerId);
                  updateStatusMutation.mutate({ id: rejectSellerId, seller_status: "rejected", rejection_reason: rejectionReason, userId: seller?.user_id });
                }
              }} disabled={updateStatusMutation.isPending} className="flex-1 rounded-xl">
                Reprovar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/New Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg font-bold">{editing ? "Editar Vendedor" : "Novo Vendedor"}</DialogTitle>
            <p className="text-xs text-muted-foreground">Preencha os dados do vendedor abaixo</p>
          </DialogHeader>
          <div className="grid gap-5 px-6 pb-6 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo do vendedor" className="rounded-xl border border-border bg-background h-11" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vendedor@email.com" className="rounded-xl border border-border bg-background h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 0000-0000" className="rounded-xl border border-border bg-background h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Documento</Label>
                <Input value={form.document} onChange={e => setForm(f => ({ ...f, document: e.target.value }))} placeholder="CPF ou CNPJ" className="rounded-xl border border-border bg-background h-11" />
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Meta Mensal (R$)</Label>
                <Input type="number" value={form.monthly_goal} onChange={e => setForm(f => ({ ...f, monthly_goal: Number(e.target.value) }))} placeholder="0,00" className="rounded-xl border border-border bg-background h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comissão (%)</Label>
                <Input type="number" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: Number(e.target.value) }))} placeholder="0" className="rounded-xl border border-border bg-background h-11" />
              </div>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || !form.email || saveMutation.isPending} className="rounded-xl h-11 mt-1 font-semibold">
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
