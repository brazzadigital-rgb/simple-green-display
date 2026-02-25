import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialFilters } from "@/hooks/useFinancialFilters";
import { PeriodFilter } from "@/components/admin/financial/PeriodFilter";
import { KpiCard } from "@/components/admin/financial/KpiCard";
import { formatBRL, exportToCsv } from "@/lib/exportCsv";
import { CreditCard, CheckCircle, AlertTriangle, Download } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function FinancialConciliation() {
  const filters = useFinancialFilters("30d");
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { from, to } = filters.dateRange;
      const { data } = await supabase.from("financial_transactions").select("*, orders(order_number)").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false });
      setTransactions(data || []);
    };
    fetch();
  }, [filters.dateRange]);

  const confirmed = transactions.filter(t => t.status === "confirmed");
  const pending = transactions.filter(t => t.status === "pending");
  const totalFees = transactions.reduce((s, t) => s + Number(t.fees), 0);
  const totalNet = confirmed.reduce((s, t) => s + Number(t.net_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Conciliação</h1>
          <p className="text-muted-foreground text-sm">Pagamentos recebidos vs pedidos</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter {...filters} />
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => exportToCsv("conciliacao", transactions.map(t => ({
            Data: t.payment_date ? format(new Date(t.payment_date), "dd/MM/yyyy") : "-",
            Pedido: (t as any).orders?.order_number || "-",
            Gateway: t.gateway,
            "Transaction ID": t.transaction_id || "-",
            Valor: Number(t.amount).toFixed(2),
            Taxas: Number(t.fees).toFixed(2),
            Líquido: Number(t.net_amount).toFixed(2),
            Status: t.status,
          })))}><Download className="w-4 h-4 mr-1" />CSV</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Confirmadas" value={formatBRL(totalNet)} subtitle={`${confirmed.length} transações`} icon={CheckCircle} color="text-emerald-600" index={0} />
        <KpiCard title="Pendentes" value={`${pending.length} transações`} icon={AlertTriangle} color="text-amber-600" index={1} />
        <KpiCard title="Taxas Totais" value={formatBRL(totalFees)} icon={CreditCard} color="text-muted-foreground" index={2} />
        <KpiCard title="Líquido Recebido" value={formatBRL(totalNet)} icon={CreditCard} color="text-accent" index={3} />
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Data</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Pedido</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Gateway</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">ID Transação</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Valor</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Taxas</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Líquido</th>
                    <th className="text-center p-3 font-sans font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} className="border-b hover:bg-muted/10">
                      <td className="p-3">{t.payment_date ? format(new Date(t.payment_date), "dd/MM/yy") : "-"}</td>
                      <td className="p-3 font-mono text-xs">#{(t as any).orders?.order_number || "-"}</td>
                      <td className="p-3 capitalize">{t.gateway}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{t.transaction_id || "-"}</td>
                      <td className="p-3 text-right">{formatBRL(Number(t.amount))}</td>
                      <td className="p-3 text-right text-muted-foreground">{formatBRL(Number(t.fees))}</td>
                      <td className="p-3 text-right font-semibold">{formatBRL(Number(t.net_amount))}</td>
                      <td className="p-3 text-center">
                        <span className={`admin-status-pill ${t.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : t.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhuma transação no período</td></tr>
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
