import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialFilters } from "@/hooks/useFinancialFilters";
import { PeriodFilter } from "@/components/admin/financial/PeriodFilter";
import { KpiCard } from "@/components/admin/financial/KpiCard";
import { formatBRL, formatPercent } from "@/lib/exportCsv";
import {
  DollarSign, ShoppingCart, TrendingUp, Package, Tag, Truck, ReceiptText,
  ArrowDownCircle, Percent, CreditCard, BarChart3, Eye, EyeOff
} from "lucide-react";
import { useHideValues, BLUR_CLASS } from "@/hooks/useHideValues";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { format, eachDayOfInterval } from "date-fns";
import { motion } from "framer-motion";

interface DailyStat { date: string; revenue: number; orders: number; }

const PIE_COLORS = ["hsl(var(--accent))", "hsl(var(--primary))", "hsl(var(--muted-foreground))", "hsl(var(--admin-success))"];

export default function FinancialDashboard() {
  const { hidden, toggle } = useHideValues();
  const filters = useFinancialFilters("30d");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    grossRevenue: 0, netRevenue: 0, orderCount: 0, avgTicket: 0,
    itemsSold: 0, discountsGiven: 0, shippingCharged: 0, cogs: 0,
    grossProfit: 0, grossMargin: 0, refundsTotal: 0, refundsCount: 0,
    feesTotal: 0, operationalProfit: 0,
  });
  const [dailyData, setDailyData] = useState<DailyStat[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const { from, to } = filters.dateRange;

      const [ordersRes, itemsRes, refundsRes, transRes] = await Promise.all([
        supabase.from("orders").select("*").gte("created_at", from).lte("created_at", to),
        supabase.from("order_items").select("*, orders!inner(created_at, status, payment_status)").gte("orders.created_at", from).lte("orders.created_at", to),
        supabase.from("refunds").select("*").gte("created_at", from).lte("created_at", to),
        supabase.from("financial_transactions").select("*").gte("created_at", from).lte("created_at", to),
      ]);

      const orders = ordersRes.data || [];
      const items = itemsRes.data || [];
      const refunds = refundsRes.data || [];
      const transactions = transRes.data || [];

      const paidOrders = orders.filter(o => o.payment_status === "paid" || o.status === "completed");
      const grossRevenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
      const refundsTotal = refunds.reduce((s, r) => s + Number(r.amount), 0);
      const discountsGiven = paidOrders.reduce((s, o) => s + Number(o.discount), 0);
      const netRevenue = grossRevenue - refundsTotal - discountsGiven;
      const shippingCharged = paidOrders.reduce((s, o) => s + Number(o.shipping_cost || o.shipping_price || 0), 0);
      const itemsSold = items.reduce((s, i) => s + Number(i.quantity), 0);
      const feesTotal = transactions.reduce((s, t) => s + Number(t.fees), 0);

      let cogs = 0;
      for (const item of items) {
        if (item.product_id) {
          const { data: prod } = await supabase.from("products").select("cost_price").eq("id", item.product_id).single();
          if (prod?.cost_price) cogs += Number(prod.cost_price) * Number(item.quantity);
        }
      }

      const grossProfit = netRevenue - cogs;
      const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
      const operationalProfit = grossProfit - feesTotal;

      setKpis({
        grossRevenue, netRevenue,
        orderCount: paidOrders.length,
        avgTicket: paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0,
        itemsSold, discountsGiven, shippingCharged, cogs,
        grossProfit, grossMargin, refundsTotal, refundsCount: refunds.length,
        feesTotal, operationalProfit,
      });

      const days = eachDayOfInterval({ start: filters.dateRange.fromDate, end: filters.dateRange.toDate });
      const daily = days.map(d => {
        const key = format(d, "yyyy-MM-dd");
        const dayOrders = paidOrders.filter(o => format(new Date(o.created_at), "yyyy-MM-dd") === key);
        return { date: format(d, "dd/MM"), revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0), orders: dayOrders.length };
      });
      setDailyData(daily);

      const methodMap: Record<string, number> = {};
      paidOrders.forEach(o => {
        const m = o.payment_method || "Não informado";
        methodMap[m] = (methodMap[m] || 0) + Number(o.total);
      });
      setPaymentMethods(Object.entries(methodMap).map(([name, value]) => ({ name, value })));

      setLoading(false);
    };
    fetchAll();
  }, [filters.dateRange]);

  const cards = [
    { title: "Receita Bruta", value: formatBRL(kpis.grossRevenue), icon: DollarSign, color: "text-emerald-600" },
    { title: "Receita Líquida", value: formatBRL(kpis.netRevenue), icon: TrendingUp, color: "text-accent" },
    { title: "Nº Pedidos", value: kpis.orderCount, icon: ShoppingCart, color: "text-primary", isMoney: false },
    { title: "Ticket Médio", value: formatBRL(kpis.avgTicket), icon: ReceiptText, color: "text-accent" },
    { title: "Itens Vendidos", value: kpis.itemsSold, icon: Package, color: "text-primary", isMoney: false },
    { title: "Descontos", value: formatBRL(kpis.discountsGiven), icon: Tag, color: "text-amber-600" },
    { title: "Frete Cobrado", value: formatBRL(kpis.shippingCharged), icon: Truck, color: "text-primary" },
    { title: "COGS", value: formatBRL(kpis.cogs), icon: BarChart3, color: "text-muted-foreground" },
    { title: "Lucro Bruto", value: formatBRL(kpis.grossProfit), icon: TrendingUp, color: "text-emerald-600" },
    { title: "Margem Bruta", value: formatPercent(kpis.grossMargin), icon: Percent, color: "text-emerald-600" },
    { title: "Reembolsos", value: `${formatBRL(kpis.refundsTotal)} (${kpis.refundsCount})`, icon: ArrowDownCircle, color: "text-destructive" },
    { title: "Taxas", value: formatBRL(kpis.feesTotal), icon: CreditCard, color: "text-muted-foreground" },
    { title: "Lucro Operacional", value: formatBRL(kpis.operationalProfit), icon: DollarSign, color: "text-emerald-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-display font-bold">Visão Geral Financeira</h1>
            <p className="text-muted-foreground text-sm">Indicadores e métricas do período</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} className="shrink-0">
            {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </Button>
        </div>
        <PeriodFilter {...filters} />
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {cards.map((c, i) => (
          <KpiCard key={c.title} {...c} index={i} />
        ))}
      </div>

      {/* Receita Diária - Area Chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="admin-card">
          <CardHeader><CardTitle className="font-display text-lg">Receita Diária</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="finRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#finRevGrad)" name="Receita" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="admin-card h-full">
            <CardHeader><CardTitle className="font-display text-lg">Pedidos por Dia</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Pedidos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="admin-card h-full">
            <CardHeader><CardTitle className="font-display text-lg">Métodos de Pagamento</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-center justify-center">
                {paymentMethods.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentMethods} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                        {paymentMethods.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">Sem dados no período</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
