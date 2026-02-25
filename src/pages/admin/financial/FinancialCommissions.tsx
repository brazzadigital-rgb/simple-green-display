import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialFilters } from "@/hooks/useFinancialFilters";
import { PeriodFilter } from "@/components/admin/financial/PeriodFilter";
import { KpiCard } from "@/components/admin/financial/KpiCard";
import { formatBRL, exportToCsv } from "@/lib/exportCsv";
import { DollarSign, Users, Download, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function FinancialCommissions() {
  const filters = useFinancialFilters("30d");
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [sellers, setSellers] = useState<Record<string, string>>({});

  const fetchData = async () => {
    const { from, to } = filters.dateRange;
    const [comRes, selRes] = await Promise.all([
      supabase.from("commissions").select("*").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }),
      supabase.from("sellers").select("id, name"),
    ]);
    setCommissions(comRes.data || []);
    const map: Record<string, string> = {};
    (selRes.data || []).forEach(s => { map[s.id] = s.name; });
    setSellers(map);
  };

  useEffect(() => { fetchData(); }, [filters.dateRange]);

  const totalPending = commissions.filter(c => c.payment_status === "pending").reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalPaid = commissions.filter(c => c.payment_status === "paid").reduce((s, c) => s + Number(c.commission_amount), 0);
  const uniqueSellers = new Set(commissions.map(c => c.seller_id)).size;

  const markAsPaid = async (id: string) => {
    await supabase.from("commissions").update({ payment_status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Comissão marcada como paga", variant: "default" });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Comissões</h1>
          <p className="text-muted-foreground text-sm">Controle de comissões de vendedores</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter {...filters} />
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => exportToCsv("comissoes", commissions.map(c => ({
            Vendedor: sellers[c.seller_id] || c.seller_id, Venda: Number(c.sale_amount).toFixed(2),
            "Taxa %": c.commission_rate, Comissão: Number(c.commission_amount).toFixed(2),
            Status: c.payment_status, Data: format(new Date(c.created_at), "dd/MM/yyyy"),
          })))}><Download className="w-4 h-4 mr-1" />CSV</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <KpiCard title="Pendente" value={formatBRL(totalPending)} icon={DollarSign} color="text-amber-600" index={0} />
        <KpiCard title="Pago" value={formatBRL(totalPaid)} icon={CheckCircle} color="text-emerald-600" index={1} />
        <KpiCard title="Vendedores" value={uniqueSellers} icon={Users} color="text-primary" index={2} />
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Data</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Vendedor</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Venda</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Taxa</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Comissão</th>
                    <th className="text-center p-3 font-sans font-medium text-muted-foreground">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => (
                    <tr key={c.id} className="border-b hover:bg-muted/10">
                      <td className="p-3">{format(new Date(c.created_at), "dd/MM/yy")}</td>
                      <td className="p-3 font-medium">{sellers[c.seller_id] || "-"}</td>
                      <td className="p-3 text-right">{formatBRL(Number(c.sale_amount))}</td>
                      <td className="p-3 text-right">{c.commission_rate}%</td>
                      <td className="p-3 text-right font-semibold">{formatBRL(Number(c.commission_amount))}</td>
                      <td className="p-3 text-center">
                        <span className={`admin-status-pill ${c.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {c.payment_status === "paid" ? "Pago" : "Pendente"}
                        </span>
                      </td>
                      <td className="p-3">
                        {c.payment_status === "pending" && (
                          <Button variant="outline" size="sm" onClick={() => markAsPaid(c.id)} className="text-xs rounded-xl">Pagar</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {commissions.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma comissão no período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
