import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialFilters } from "@/hooks/useFinancialFilters";
import { PeriodFilter } from "@/components/admin/financial/PeriodFilter";
import { KpiCard } from "@/components/admin/financial/KpiCard";
import { formatBRL, formatPercent } from "@/lib/exportCsv";
import { TrendingUp, TrendingDown, AlertTriangle, Percent } from "lucide-react";
import { motion } from "framer-motion";

interface MarginItem {
  id: string; name: string; revenue: number; cogs: number; profit: number; margin: number;
}

export default function FinancialCosts() {
  const filters = useFinancialFilters("30d");
  const [items, setItems] = useState<MarginItem[]>([]);
  const [avgMargin, setAvgMargin] = useState(0);
  const [totalCogs, setTotalCogs] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { from, to } = filters.dateRange;
      const { data } = await supabase
        .from("order_items")
        .select("*, orders!inner(created_at, payment_status), products(name, cost_price, packaging_cost, customization_cost)")
        .gte("orders.created_at", from).lte("orders.created_at", to);

      const paid = (data || []).filter(i => (i as any).orders?.payment_status === "paid");
      const map: Record<string, MarginItem> = {};
      for (const item of paid) {
        const pid = item.product_id || "unknown";
        const prod = (item as any).products;
        const pname = prod?.name || item.product_name;
        const costPerUnit = Number(prod?.cost_price || 0) + Number(prod?.packaging_cost || 0) + Number(prod?.customization_cost || 0);
        if (!map[pid]) map[pid] = { id: pid, name: pname, revenue: 0, cogs: 0, profit: 0, margin: 0 };
        map[pid].revenue += Number(item.total_price);
        map[pid].cogs += costPerUnit * Number(item.quantity);
      }
      const list = Object.values(map).map(p => ({
        ...p, profit: p.revenue - p.cogs, margin: p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0,
      }));
      list.sort((a, b) => a.margin - b.margin);
      setItems(list);
      const tCogs = list.reduce((s, i) => s + i.cogs, 0);
      const tProfit = list.reduce((s, i) => s + i.profit, 0);
      const tRevenue = list.reduce((s, i) => s + i.revenue, 0);
      setTotalCogs(tCogs); setTotalProfit(tProfit);
      setAvgMargin(tRevenue > 0 ? ((tRevenue - tCogs) / tRevenue) * 100 : 0);
    };
    fetch();
  }, [filters.dateRange]);

  const lowMargin = items.filter(i => i.margin < 20 && i.revenue > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Custos e Margem</h1>
          <p className="text-muted-foreground text-sm">COGS, lucro bruto e margem por produto</p>
        </div>
        <PeriodFilter {...filters} />
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <KpiCard title="COGS Total" value={formatBRL(totalCogs)} icon={TrendingDown} color="text-amber-600" index={0} />
        <KpiCard title="Lucro Bruto" value={formatBRL(totalProfit)} icon={TrendingUp} color="text-emerald-600" index={1} />
        <KpiCard title="Margem Média" value={formatPercent(avgMargin)} icon={Percent} color="text-accent" index={2} />
        <KpiCard title="Margem Baixa" value={`${lowMargin.length} produtos`} icon={AlertTriangle} color="text-destructive" index={3} />
      </div>

      {lowMargin.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="admin-card border-l-4 border-l-destructive">
            <CardHeader><CardTitle className="font-display text-lg text-destructive">⚠️ Produtos com Margem Baixa (&lt;20%)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowMargin.slice(0, 10).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-destructive/5">
                    <span className="font-medium">{p.name}</span>
                    <div className="flex gap-4 text-right">
                      <span className="text-muted-foreground">Custo: {formatBRL(p.cogs)}</span>
                      <span className="text-destructive font-bold">{formatPercent(p.margin)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="admin-card">
          <CardHeader><CardTitle className="font-display text-lg">Margem por Produto</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Produto</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Receita</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">COGS</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Lucro</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => (
                    <tr key={p.id} className="border-b hover:bg-muted/10">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 text-right">{formatBRL(p.revenue)}</td>
                      <td className="p-3 text-right text-muted-foreground">{formatBRL(p.cogs)}</td>
                      <td className="p-3 text-right font-semibold">{formatBRL(p.profit)}</td>
                      <td className="p-3 text-right">
                        <span className={p.margin < 20 ? "text-destructive font-bold" : "text-emerald-600"}>{formatPercent(p.margin)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
