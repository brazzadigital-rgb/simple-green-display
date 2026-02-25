import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Percent, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { KpiCard } from "@/components/admin/financial/KpiCard";
import { DollarSign, Clock } from "lucide-react";

interface Commission {
  id: string; order_id: string | null; seller_id: string; sale_amount: number;
  commission_rate: number; commission_amount: number; payment_status: string;
  paid_at: string | null; created_at: string;
  sellers?: { name: string } | null; orders?: { order_number: string } | null;
}

export default function AdminCommissions() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commissions").select("*, sellers(name), orders(order_number)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Commission[];
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commissions").update({ payment_status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-commissions"] }); toast({ title: "Comissão marcada como paga" }); },
  });

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const filtered = commissions.filter(c => {
    if (statusFilter !== "all" && c.payment_status !== statusFilter) return false;
    if (search && !(c.sellers?.name || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPending = commissions.filter(c => c.payment_status === "pending").reduce((sum, c) => sum + Number(c.commission_amount), 0);
  const totalPaid = commissions.filter(c => c.payment_status === "paid").reduce((sum, c) => sum + Number(c.commission_amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comissões</h1>
        <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Acompanhe e gerencie comissões dos vendedores</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard title="Total Pendente" value={formatCurrency(totalPending)} icon={Clock} color="text-amber-600" index={0} />
        <KpiCard title="Total Pago" value={formatCurrency(totalPaid)} icon={CheckCircle} color="text-emerald-600" index={1} />
        <KpiCard title="Total Registros" value={commissions.length} icon={DollarSign} color="text-primary" index={2} />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar vendedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl border-0 bg-muted/30" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 rounded-xl border-0 bg-muted/30"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid hsl(var(--admin-border))` }}>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: `hsl(var(--admin-text-secondary))` }}>Vendedor</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold hidden md:table-cell" style={{ color: `hsl(var(--admin-text-secondary))` }}>Pedido</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: `hsl(var(--admin-text-secondary))` }}>Venda</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: `hsl(var(--admin-text-secondary))` }}>Comissão</th>
                  <th className="text-center px-4 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: `hsl(var(--admin-text-secondary))` }}>Status</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-semibold" style={{ color: `hsl(var(--admin-text-secondary))` }}>Ações</th>
                </tr>
              </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Carregando...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Percent className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      Nenhuma comissão encontrada
                    </td></tr>
                  ) : filtered.map(c => (
                    <tr key={c.id} className="transition-colors hover:bg-muted/20" style={{ borderBottom: `1px solid hsl(var(--admin-border-subtle))` }}>
                      <td className="px-4 py-3.5 font-medium">{c.sellers?.name || "—"}</td>
                      <td className="px-4 py-3.5 hidden md:table-cell font-mono text-xs" style={{ color: `hsl(var(--admin-text-secondary))` }}>#{c.orders?.order_number || "—"}</td>
                      <td className="px-4 py-3.5 text-right">{formatCurrency(Number(c.sale_amount))}</td>
                      <td className="px-4 py-3.5 text-right font-semibold">{formatCurrency(Number(c.commission_amount))} <span className="font-normal text-xs" style={{ color: `hsl(var(--admin-text-secondary))` }}>({c.commission_rate}%)</span></td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`admin-status-pill text-[10px] ${c.payment_status === "paid" ? "admin-status-success" : c.payment_status === "cancelled" ? "admin-status-danger" : "admin-status-warning"}`}>
                          {c.payment_status === "paid" ? "Pago" : c.payment_status === "cancelled" ? "Cancelado" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {c.payment_status === "pending" && (
                          <Button variant="ghost" size="sm" className="rounded-lg text-emerald-600 gap-1 hover:bg-emerald-50" onClick={() => markPaidMutation.mutate(c.id)}>
                            <CheckCircle className="w-4 h-4" /> Pagar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
