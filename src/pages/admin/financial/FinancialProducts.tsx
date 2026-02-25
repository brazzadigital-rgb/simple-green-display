import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialFilters } from "@/hooks/useFinancialFilters";
import { PeriodFilter } from "@/components/admin/financial/PeriodFilter";
import { KpiCard } from "@/components/admin/financial/KpiCard";
import { formatBRL, formatPercent, exportToCsv } from "@/lib/exportCsv";
import { Package, TrendingUp, DollarSign, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { motion } from "framer-motion";

interface ProductStat {
  id: string; name: string; unitsSold: number; revenue: number; cogs: number; grossProfit: number; margin: number;
}

export default function FinancialProducts() {
  const filters = useFinancialFilters("30d");
  const [products, setProducts] = useState<ProductStat[]>([]);
  const [metric, setMetric] = useState<"revenue" | "unitsSold" | "grossProfit">("revenue");

  useEffect(() => {
    const fetch = async () => {
      const { from, to } = filters.dateRange;
      const { data: items } = await supabase
        .from("order_items")
        .select("*, orders!inner(created_at, payment_status), products(name, cost_price)")
        .gte("orders.created_at", from).lte("orders.created_at", to);

      const paidItems = (items || []).filter(i => (i as any).orders?.payment_status === "paid");
      const map: Record<string, ProductStat> = {};
      for (const item of paidItems) {
        const pid = item.product_id || "unknown";
        const pname = (item as any).products?.name || item.product_name;
        const costPrice = Number((item as any).products?.cost_price || 0);
        if (!map[pid]) map[pid] = { id: pid, name: pname, unitsSold: 0, revenue: 0, cogs: 0, grossProfit: 0, margin: 0 };
        map[pid].unitsSold += Number(item.quantity);
        map[pid].revenue += Number(item.total_price);
        map[pid].cogs += costPrice * Number(item.quantity);
      }
      const list = Object.values(map).map(p => ({
        ...p, grossProfit: p.revenue - p.cogs, margin: p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0,
      }));
      list.sort((a, b) => b.revenue - a.revenue);
      setProducts(list);
    };
    fetch();
  }, [filters.dateRange]);

  const topByUnits = [...products].sort((a, b) => b.unitsSold - a.unitsSold)[0];
  const topByRevenue = products[0];
  const topByProfit = [...products].sort((a, b) => b.grossProfit - a.grossProfit)[0];
  const chartData = products.slice(0, 10).map(p => ({ name: p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name, [metric]: p[metric] }));
  const metricLabels = { revenue: "Receita", unitsSold: "Unidades", grossProfit: "Lucro" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Performance de Produtos</h1>
          <p className="text-muted-foreground text-sm">Top produtos mais vendidos</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter {...filters} />
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => exportToCsv("produtos-financeiro", products.map(p => ({
            Produto: p.name, Unidades: p.unitsSold, Receita: p.revenue.toFixed(2), COGS: p.cogs.toFixed(2), Lucro: p.grossProfit.toFixed(2), "Margem %": p.margin.toFixed(1),
          })))}><Download className="w-4 h-4 mr-1" />CSV</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <KpiCard title="Top por Qtd" value={topByUnits?.name || "-"} subtitle={`${topByUnits?.unitsSold || 0} unid.`} icon={Package} color="text-primary" index={0} />
        <KpiCard title="Top por Receita" value={topByRevenue?.name || "-"} subtitle={formatBRL(topByRevenue?.revenue || 0)} icon={DollarSign} color="text-accent" index={1} />
        <KpiCard title="Top por Lucro" value={topByProfit?.name || "-"} subtitle={formatBRL(topByProfit?.grossProfit || 0)} icon={TrendingUp} color="text-emerald-600" index={2} />
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg">Top 10 Produtos</CardTitle>
              <div className="flex gap-1">
                {(["revenue", "unitsSold", "grossProfit"] as const).map(m => (
                  <Button key={m} variant={metric === m ? "default" : "outline"} size="sm" onClick={() => setMetric(m)} className="text-xs rounded-xl">
                    {metricLabels[m]}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" width={100} />
                  <Tooltip formatter={(v: number) => metric === "unitsSold" ? v : formatBRL(v)} />
                  <Bar dataKey={metric} fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="admin-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Produto</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Unid.</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Receita</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">COGS</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Lucro</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className="border-b hover:bg-muted/10">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 text-right">{p.unitsSold}</td>
                      <td className="p-3 text-right">{formatBRL(p.revenue)}</td>
                      <td className="p-3 text-right text-muted-foreground">{formatBRL(p.cogs)}</td>
                      <td className="p-3 text-right font-semibold text-emerald-600">{formatBRL(p.grossProfit)}</td>
                      <td className="p-3 text-right">
                        <span className={p.margin < 20 ? "text-destructive font-bold" : "text-emerald-600"}>{formatPercent(p.margin)}</span>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sem dados no período</td></tr>
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
