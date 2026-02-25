import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign, TrendingUp, ShoppingBag, Clock, Target, Percent, ArrowUpRight, Eye, EyeOff
} from "lucide-react";
import { useHideValues, BLUR_CLASS } from "@/hooks/useHideValues";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SellerData {
  id: string; name: string; commission_rate: number; monthly_goal: number; referral_code: string;
}

const statusLabel: Record<string, string> = {
  pending: "Pendente", processing: "Processando", completed: "Concluído",
  shipped: "Enviado", cancelled: "Cancelado", delivered: "Entregue",
};

const statusPillClass: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  delivered: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-blue-50 text-blue-700",
  cancelled: "bg-red-50 text-red-700",
};

function ChartTooltipCustom({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-[11px] text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold text-slate-800">
          {p.name}: {p.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      ))}
    </div>
  );
}

export default function SellerDashboard() {
  const { sellerId } = useAuth();
  const { hidden, toggle } = useHideValues();
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [stats, setStats] = useState({ totalSales: 0, totalCommission: 0, pendingCommission: 0, availableCommission: 0, orderCount: 0, conversionRate: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    const load = async () => {
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);

      const [sellerRes, commissionsRes, clicksRes] = await Promise.all([
        supabase.from("sellers").select("id, name, commission_rate, monthly_goal, referral_code").eq("id", sellerId).maybeSingle(),
        supabase.from("commissions").select("*").eq("seller_id", sellerId),
        supabase.from("seller_link_clicks").select("id, converted").eq("seller_id", sellerId),
      ]);

      const s = sellerRes.data as SellerData | null;
      setSeller(s);

      // Fetch orders by seller_id AND referral_code
      const ordersBySellerP = supabase.from("orders").select("id, order_number, total, status, created_at, customer_name").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(20);
      const ordersByRefP = s?.referral_code
        ? supabase.from("orders").select("id, order_number, total, status, created_at, customer_name").eq("referral_code", s.referral_code).order("created_at", { ascending: false }).limit(20)
        : Promise.resolve({ data: [] });

      const [ordersBySellerRes, ordersByRefRes] = await Promise.all([ordersBySellerP, ordersByRefP]);

      // Merge & deduplicate orders
      const allOrders = [...(ordersBySellerRes.data || []), ...((ordersByRefRes as any).data || [])];
      const seenIds = new Set<string>();
      const uniqueOrders = allOrders.filter(o => {
        if (seenIds.has(o.id)) return false;
        seenIds.add(o.id);
        return true;
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRecentOrders(uniqueOrders.slice(0, 5));

      const comms = (commissionsRes.data as any[]) || [];
      const totalSales = comms.reduce((a, c) => a + Number(c.sale_amount), 0);
      const totalCommission = comms.reduce((a, c) => a + Number(c.commission_amount), 0);
      const pendingCommission = comms.filter(c => c.payment_status === "pending").reduce((a, c) => a + Number(c.commission_amount), 0);
      const paidCommission = comms.filter(c => c.payment_status === "paid").reduce((a, c) => a + Number(c.commission_amount), 0);

      const clicks = (clicksRes.data as any[]) || [];
      const conversions = clicks.filter(c => c.converted).length;
      const conversionRate = clicks.length > 0 ? (conversions / clicks.length) * 100 : 0;

      // Build daily revenue from commissions (last 30 days)
      const days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });
      const dailyData = days.map(d => {
        const key = format(d, "yyyy-MM-dd");
        const dayComms = comms.filter(c => format(new Date(c.created_at), "yyyy-MM-dd") === key);
        return { date: format(d, "dd/MM"), revenue: dayComms.reduce((a, c) => a + Number(c.commission_amount), 0) };
      });
      setDailyRevenue(dailyData);

      setStats({ totalSales, totalCommission, pendingCommission, availableCommission: totalCommission - paidCommission - pendingCommission, orderCount: uniqueOrders.length, conversionRate });
      setLoading(false);
    };
    load();
  }, [sellerId]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const blurIf = hidden ? BLUR_CLASS : "";

  const fadeUp = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35 } },
  });

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    </div>
  );

  if (!seller) return <p className="text-center py-20 text-slate-400">Vendedor não encontrado.</p>;

  const kpis = [
    { label: "Total vendido", value: fmt(stats.totalSales), icon: ShoppingBag, sub: "suas indicações", isMoney: true },
    { label: "Comissão gerada", value: fmt(stats.totalCommission), icon: DollarSign, trend: true, sub: "acumulado", isMoney: true },
    { label: "Disponível", value: fmt(stats.availableCommission), icon: TrendingUp, sub: "para saque", isMoney: true },
    { label: "Em análise", value: fmt(stats.pendingCommission), icon: Clock, sub: "aguardando", isMoney: true },
    { label: "Pedidos", value: stats.orderCount.toString(), icon: Target, sub: "total de vendas" },
    { label: "Conversão", value: `${stats.conversionRate.toFixed(1)}%`, icon: Percent, sub: "links → vendas" },
  ];

  return (
    <div className="space-y-6">
      {/* ═══ KPIs ═══ */}
      <div className="flex items-center justify-end mb-1">
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted/40"
          title={hidden ? "Mostrar valores" : "Ocultar valores"}
        >
          {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{hidden ? "Mostrar" : "Ocultar"} valores</span>
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeUp(i)}>
            <div className="group bg-white rounded-2xl border border-slate-100 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200 cursor-default h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{kpi.label}</span>
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <kpi.icon className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-xl font-bold text-slate-800 tracking-tight ${kpi.isMoney ? blurIf : ""}`}>{kpi.value}</p>
              <p className="text-[11px] text-slate-400 mt-2">{kpi.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ Chart + Recent Orders ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Commission chart */}
        <motion.div className="lg:col-span-3" {...fadeUp(6)}>
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="mb-6">
              <h3 className="text-base font-semibold text-slate-800">Comissões Diárias</h3>
              <p className="text-xs text-slate-400 mt-0.5">Últimos 30 dias</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyRevenue}>
                  <defs>
                    <linearGradient id="sellerRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip content={<ChartTooltipCustom />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Comissão"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#sellerRevenueGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Recent Orders */}
        <motion.div className="lg:col-span-2" {...fadeUp(7)}>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden h-full flex flex-col">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-base font-semibold text-slate-800">Últimas Vendas</h3>
              <p className="text-xs text-slate-400 mt-0.5">Seus pedidos mais recentes</p>
            </div>

            {recentOrders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
                <ShoppingBag className="w-10 h-10 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">Nenhuma venda ainda</p>
              </div>
            ) : (
              <div className="px-4 pb-4 space-y-1 flex-1">
                {recentOrders.map((o, idx) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-600 truncate">{o.customer_name || "Cliente"}</p>
                      <p className="text-[11px] text-slate-400">
                        #{o.order_number} · {format(new Date(o.created_at), "dd MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`text-sm font-semibold text-slate-800 ${blurIf}`}>{fmt(Number(o.total))}</p>
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${statusPillClass[o.status] || "bg-slate-50 text-slate-600"}`}>
                        {statusLabel[o.status] || o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
