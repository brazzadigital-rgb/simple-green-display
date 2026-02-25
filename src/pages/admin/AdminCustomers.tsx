import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, ShoppingBag, Crown, X, Download, MessageCircle, ShieldCheck, ShieldOff, Eye
} from "lucide-react";

interface CustomerProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email?: string | null;
  cpf: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface OrderSummary {
  user_id: string;
  count: number;
  total: number;
  last_date: string | null;
}

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adminConfirm, setAdminConfirm] = useState<{ userId: string; name: string; isAdmin: boolean } | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Toggle admin role
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isCurrentlyAdmin }: { userId: string; isCurrentlyAdmin: boolean }) => {
      if (isCurrentlyAdmin) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-customer-roles"] });
      toast({ title: vars.isCurrentlyAdmin ? "Admin removido" : "Promovido a admin" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  // Fetch profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as (CustomerProfile & { email?: string | null })[];
    },
  });

  // Fetch user roles
  const { data: userRoles = {} } = useQuery({
    queryKey: ["admin-customer-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      const map: Record<string, string[]> = {};
      data?.forEach((r: any) => {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r.role);
      });
      return map;
    },
  });

  // Fetch order summaries
  const { data: orderSummaries = {} } = useQuery({
    queryKey: ["admin-customer-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("user_id, total, created_at");
      const map: Record<string, OrderSummary> = {};
      data?.forEach((o: any) => {
        if (!o.user_id) return;
        if (!map[o.user_id]) map[o.user_id] = { user_id: o.user_id, count: 0, total: 0, last_date: null };
        map[o.user_id].count++;
        map[o.user_id].total += Number(o.total) || 0;
        if (!map[o.user_id].last_date || o.created_at > map[o.user_id].last_date!) {
          map[o.user_id].last_date = o.created_at;
        }
      });
      return map;
    },
  });

  // Build email map from profiles
  const userEmails: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach(p => {
      if (p.email) map[p.user_id] = p.email;
    });
    return map;
  }, [profiles]);

  const isAdmin = (userId: string) => userRoles[userId]?.includes("admin");
  const isVip = (userId: string) => {
    const os = orderSummaries[userId];
    return os && (os.count >= 5 || os.total >= 1000);
  };

  const getStatus = (userId: string) => {
    if (isAdmin(userId)) return "admin";
    if (isVip(userId)) return "vip";
    const os = orderSummaries[userId];
    if (os && os.count > 0) return "ativo";
    return "novo";
  };

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatPhone = (p: string | null) => {
    if (!p) return "—";
    const clean = p.replace(/\D/g, "");
    if (clean.length === 11) return `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}`;
    if (clean.length === 10) return `(${clean.slice(0,2)}) ${clean.slice(2,6)}-${clean.slice(6)}`;
    return p;
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  };

  // Filter & sort
  const filtered = useMemo(() => {
    let result = profiles.filter(p => {
      const q = search.toLowerCase();
      if (q && !(p.full_name?.toLowerCase().includes(q) || p.phone?.includes(q) || userEmails[p.user_id]?.toLowerCase().includes(q))) return false;
      if (statusFilter === "vip" && !isVip(p.user_id)) return false;
      if (statusFilter === "ativo" && !(orderSummaries[p.user_id]?.count > 0)) return false;
      if (statusFilter === "novo" && orderSummaries[p.user_id]?.count > 0) return false;
      if (statusFilter === "admin" && !isAdmin(p.user_id)) return false;
      return true;
    });
    result.sort((a, b) => {
      const osA = orderSummaries[a.user_id];
      const osB = orderSummaries[b.user_id];
      if (sortBy === "spent") return (osB?.total || 0) - (osA?.total || 0);
      if (sortBy === "orders") return (osB?.count || 0) - (osA?.count || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return result;
  }, [profiles, search, statusFilter, sortBy, orderSummaries, userEmails, userRoles]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.user_id)));
  };

  const exportCSV = () => {
    const rows = filtered.filter(p => selected.has(p.user_id));
    if (rows.length === 0) return;
    const header = "Nome,Email,Telefone,Pedidos,Total Gasto,Cadastro\n";
    const csv = header + rows.map(p => {
      const os = orderSummaries[p.user_id];
      return `"${p.full_name || ""}","${userEmails[p.user_id] || ""}","${p.phone || ""}",${os?.count || 0},${os?.total?.toFixed(2) || "0"},${new Date(p.created_at).toLocaleDateString("pt-BR")}`;
    }).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "clientes.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${rows.length} clientes exportados` });
  };

  const StatusPill = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      vip: "bg-amber-50 text-amber-700 border-amber-100",
      admin: "bg-blue-50 text-blue-700 border-blue-100",
      ativo: "bg-emerald-50 text-emerald-700 border-emerald-100",
      novo: "bg-slate-50 text-slate-500 border-slate-100",
    };
    const labels: Record<string, string> = { vip: "VIP", admin: "Admin", ativo: "Ativo", novo: "Novo" };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${styles[status] || styles.novo}`}>
        {status === "vip" && <Crown className="w-3 h-3" />}
        {labels[status] || status}
      </span>
    );
  };

  // KPIs
  const totalCustomers = profiles.length;
  const totalWithOrders = Object.keys(orderSummaries).length;
  const totalRevenue = Object.values(orderSummaries).reduce((s, o) => s + o.total, 0);
  const avgTicket = totalWithOrders > 0 ? totalRevenue / Object.values(orderSummaries).reduce((s, o) => s + o.count, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800">Clientes</h1>
          <p className="text-sm text-slate-400 mt-1">{totalCustomers} clientes cadastrados</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Clientes", value: totalCustomers, icon: Users, color: "bg-slate-50 text-slate-500" },
          { label: "Com Pedidos", value: totalWithOrders, icon: ShoppingBag, color: "bg-emerald-50 text-emerald-600" },
          { label: "Receita Total", value: formatCurrency(totalRevenue), icon: Crown, color: "bg-amber-50 text-amber-600" },
          { label: "Ticket Médio", value: formatCurrency(avgTicket), icon: ShoppingBag, color: "bg-blue-50 text-blue-600" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="admin-card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest truncate">{kpi.label}</p>
              <p className="text-lg font-bold text-slate-800 truncate mt-0.5">{kpi.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="admin-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, email, telefone..." className="admin-input pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 admin-input"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="novo">Novos</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 admin-input"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recente</SelectItem>
              <SelectItem value="spent">Maior gasto</SelectItem>
              <SelectItem value="orders">Mais pedidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="admin-card p-3 flex items-center gap-3 flex-wrap bg-emerald-50 border-emerald-100">
            <span className="text-sm font-medium text-emerald-800">{selected.size} selecionado(s)</span>
            <Button variant="outline" size="sm" className="rounded-lg gap-1.5 text-xs bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </Button>
            <Button variant="ghost" size="sm" className="rounded-lg text-xs ml-auto text-emerald-700 hover:bg-emerald-100" onClick={() => setSelected(new Set())}>
              <X className="w-3.5 h-3.5" /> Limpar
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table / Cards */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="admin-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="w-12 h-12 mb-3 text-slate-200" />
            <p className="text-slate-500 font-medium">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-white">
                    <th className="text-left px-4 py-3 w-10">
                      <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} className="rounded border-slate-300" />
                    </th>
                    <th className="admin-table-th text-left">Cliente</th>
                    <th className="admin-table-th text-left hidden xl:table-cell">Email</th>
                    <th className="admin-table-th text-left">Telefone</th>
                    <th className="admin-table-th text-right">Pedidos</th>
                    <th className="admin-table-th text-right">Total Gasto</th>
                    <th className="admin-table-th text-center">Status</th>
                    <th className="admin-table-th text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const os = orderSummaries[p.user_id];
                    const status = getStatus(p.user_id);
                    const email = userEmails[p.user_id] || "";
                    return (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3">
                          <Checkbox checked={selected.has(p.user_id)} onCheckedChange={() => toggleSelect(p.user_id)} className="rounded border-slate-300" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold flex-shrink-0 border border-slate-200">
                              {p.avatar_url ? <img src={p.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" /> : getInitials(p.full_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-slate-700 truncate">{p.full_name || "Sem nome"}</p>
                              <p className="text-[11px] text-slate-400 truncate xl:hidden">{email || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-sm hidden xl:table-cell truncate max-w-[200px]">{email || "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <span>{formatPhone(p.phone)}</span>
                            {p.phone && (
                              <a
                                href={`https://wa.me/55${p.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-500 hover:text-emerald-600 transition-colors"
                                title="Conversar no WhatsApp"
                                onClick={e => e.stopPropagation()}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">{os?.count || 0}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatCurrency(os?.total || 0)}</td>
                        <td className="px-4 py-3 text-center">
                          <StatusPill status={status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7"
                              title={isAdmin(p.user_id) ? "Remover admin" : "Tornar admin"}
                              disabled={toggleAdminMutation.isPending || p.user_id === user?.id}
                              onClick={e => { e.stopPropagation(); setAdminConfirm({ userId: p.user_id, name: p.full_name || "Sem nome", isAdmin: !!isAdmin(p.user_id) }); }}
                            >
                              {isAdmin(p.user_id) ? <ShieldOff className="w-3.5 h-3.5 text-destructive" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7"
                              title="Ver detalhes"
                              onClick={e => { e.stopPropagation(); navigate(`/admin/clientes/${p.user_id}`); }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filtered.map(p => {
                const os = orderSummaries[p.user_id];
                const status = getStatus(p.user_id);
                return (
                  <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold flex-shrink-0 border border-slate-200">
                        {p.avatar_url ? <img src={p.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" /> : getInitials(p.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-800 truncate">{p.full_name || "Sem nome"}</p>
                          <StatusPill status={status} />
                        </div>
                        <p className="text-xs text-slate-400 truncate">{userEmails[p.user_id] || "—"}</p>
                      </div>
                      {p.phone && (
                        <a
                          href={`https://wa.me/55${p.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 hover:bg-emerald-100 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm border-t border-slate-50 pt-3">
                      <div>
                        <span className="text-slate-400 text-xs">Pedidos:</span> <span className="font-medium text-slate-700">{os?.count || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs">Total:</span> <span className="font-bold text-slate-800">{formatCurrency(os?.total || 0)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!adminConfirm} onOpenChange={open => { if (!open) setAdminConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {adminConfirm?.isAdmin ? "Remover privilégios de admin?" : "Promover a administrador?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {adminConfirm?.isAdmin
                ? `Tem certeza que deseja remover os privilégios de administrador de ${adminConfirm?.name}?`
                : `Tem certeza que deseja promover ${adminConfirm?.name} a administrador? Essa pessoa terá acesso total ao painel administrativo.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={adminConfirm?.isAdmin ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={() => {
                if (adminConfirm) {
                  toggleAdminMutation.mutate({ userId: adminConfirm.userId, isCurrentlyAdmin: adminConfirm.isAdmin });
                  setAdminConfirm(null);
                }
              }}
            >
              {adminConfirm?.isAdmin ? "Sim, remover" : "Sim, promover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}