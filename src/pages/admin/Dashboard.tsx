import { useEffect, useState } from "react";
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, AlertTriangle, Clock, ArrowUpRight, Plus, Receipt, Zap, Eye, EyeOff } from "lucide-react";
import { useHideValues, BLUR_CLASS } from "@/hooks/useHideValues";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { formatBRL } from "@/lib/exportCsv";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  pendingOrders: number;
  lowStockProducts: number;
  recentOrders: any[];
  dailyRevenue: { date: string; revenue: number }[];
  ordersByStatus: { name: string; value: number }[];
}

const STATUS_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#94a3b8"];

const periods = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
];

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
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold text-foreground">
          {p.name}: {formatBRL(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0, totalOrders: 0, totalRevenue: 0, totalCustomers: 0,
    pendingOrders: 0, lowStockProducts: 0, recentOrders: [], dailyRevenue: [], ordersByStatus: [],
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const navigate = useNavigate();
  const { hidden, toggle } = useHideValues();

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const from = thirtyDaysAgo.toISOString();

      const [products, orders, profiles, pendingRes, lowStockRes, recentRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total, status, created_at").gte("created_at", from),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("products").select("id", { count: "exact", head: true }).lt("stock", 5).eq("is_active", true),
        supabase.from("orders").select("id, order_number, customer_name, total, status, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const ordersData = orders.data || [];
      const totalRevenue = ordersData.reduce((s, o) => s + Number(o.total), 0);

      const days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });
      const dailyRevenue = days.map(d => {
        const key = format(d, "yyyy-MM-dd");
        const dayOrders = ordersData.filter(o => format(new Date(o.created_at), "yyyy-MM-dd") === key);
        return { date: format(d, "dd/MM"), revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0) };
      });

      const statusMap: Record<string, number> = {};
      ordersData.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
      const ordersByStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

      setStats({
        totalProducts: products.count || 0,
        totalOrders: ordersData.length,
        totalRevenue,
        totalCustomers: profiles.count || 0,
        pendingOrders: pendingRes.count || 0,
        lowStockProducts: lowStockRes.count || 0,
        recentOrders: recentRes.data || [],
        dailyRevenue,
        ordersByStatus,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const ticketMedio = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

  const kpis = [
    { label: "Receita (30d)", value: formatBRL(stats.totalRevenue), icon: DollarSign, trend: "+8.5%", trendUp: true, sub: "vs mês anterior", isMoney: true },
    { label: "Pedidos", value: String(stats.totalOrders), icon: ShoppingCart, trend: "+12.3%", trendUp: true, sub: "vs mês anterior", isMoney: false },
    { label: "Ticket Médio", value: formatBRL(ticketMedio), icon: TrendingUp, sub: "últimos 30 dias", isMoney: true },
    { label: "Produtos", value: String(stats.totalProducts), icon: Package, sub: `${stats.lowStockProducts} com estoque baixo`, isMoney: false },
    { label: "Clientes", value: String(stats.totalCustomers), icon: Users, sub: "cadastrados", isMoney: false },
    { label: "Pendentes", value: String(stats.pendingOrders), icon: Clock, sub: stats.pendingOrders > 0 ? "Aguardando ação" : "Nenhum pendente", isMoney: false },
  ];

  const fadeUp = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35 } },
  });

  return (
    <div className="space-y-6">
      {/* ═══ Header + Toggle ═══ */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
          title={hidden ? "Mostrar valores" : "Ocultar valores"}
        >
          {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {hidden ? "Mostrar" : "Ocultar"}
        </button>
      </div>

      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeUp(i)}>
            <div className="group admin-card p-5 cursor-default h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{kpi.label}</span>
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <kpi.icon className="w-4 h-4" />
                </div>
              </div>

              {loading ? (
                <Skeleton className="h-7 w-24 rounded-lg" />
              ) : (
                <p className={`text-xl font-bold text-foreground tracking-tight ${kpi.isMoney && hidden ? BLUR_CLASS : ""}`}>{kpi.value}</p>
              )}

              {kpi.trend && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-600">{kpi.trend}</span>
                  <span className="text-[10px] text-muted-foreground ml-0.5">{kpi.sub}</span>
                </div>
              )}
              {!kpi.trend && kpi.sub && (
                <p className="text-[11px] text-muted-foreground mt-2">{kpi.sub}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ CENTER — Chart + Orders by Status ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <motion.div className="lg:col-span-2" {...fadeUp(6)}>
          <div className="admin-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-foreground">Receita Diária</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Vendas realizadas no período</p>
              </div>
              <div className="flex gap-1 bg-muted rounded-xl p-1 border border-border">
                {periods.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      period === p.key
                        ? "bg-card text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72">
              {loading ? (
                <Skeleton className="h-full w-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailyRevenue}>
                    <defs>
                      <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(17, 100%, 50%)" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="hsl(17, 100%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 90%)" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(0, 0%, 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(0, 0%, 60%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip content={<ChartTooltipCustom />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Receita"
                      stroke="hsl(17, 100%, 50%)"
                      strokeWidth={2.5}
                      fill="url(#adminRevenueGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: "hsl(17, 100%, 50%)", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </motion.div>

        {/* Orders by Status */}
        <motion.div {...fadeUp(7)}>
          <div className="admin-card p-6 h-full flex flex-col">
            <h3 className="text-base font-semibold text-foreground mb-1">Pedidos por Status</h3>
            <p className="text-xs text-muted-foreground mb-5">Distribuição dos últimos 30 dias</p>

            {loading ? (
              <Skeleton className="h-[200px] w-full rounded-xl" />
            ) : stats.ordersByStatus.length > 0 ? (
              <div className="flex-1 flex flex-col">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.ordersByStatus}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        strokeWidth={0}
                      >
                        {stats.ordersByStatus.map((_, i) => (
                          <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {stats.ordersByStatus.map((s, i) => (
                    <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                      {statusLabel[s.name] || s.name} ({s.value})
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sem dados no período</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ═══ BOTTOM — Recent Orders + Quick Actions ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent Orders */}
        <motion.div className="lg:col-span-3" {...fadeUp(8)}>
          <div className="admin-card overflow-hidden">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">Últimos Pedidos</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Pedidos mais recentes da loja</p>
              </div>
              <button
                onClick={() => navigate("/admin/pedidos")}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Ver todos <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="px-6 pb-6 space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
              </div>
            ) : stats.recentOrders.length > 0 ? (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  <span className="col-span-1">Nº</span>
                  <span className="col-span-3">Cliente</span>
                  <span className="col-span-2">Pedido</span>
                  <span className="col-span-2">Valor</span>
                  <span className="col-span-2">Status</span>
                  <span className="col-span-2 text-right">Data</span>
                </div>
                <div className="space-y-1">
                  {stats.recentOrders.map((order, idx) => (
                    <div
                      key={order.id}
                      onClick={() => navigate(`/admin/pedidos/${order.id}`)}
                      className="grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-xl transition-colors duration-150 hover:bg-muted cursor-pointer"
                    >
                      <span className="col-span-1 text-xs text-muted-foreground font-mono">{idx + 1}.</span>
                      <span className="col-span-3 text-xs text-foreground/70 font-medium truncate">
                        {order.customer_name || "—"}
                      </span>
                      <span className="col-span-2 text-xs text-muted-foreground font-mono">#{order.order_number}</span>
                      <span className={`col-span-2 text-sm font-semibold text-foreground ${hidden ? BLUR_CLASS : ""}`}>{formatBRL(Number(order.total))}</span>
                      <span className="col-span-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusPillClass[order.status] || "bg-muted text-muted-foreground"}`}>
                          {statusLabel[order.status] || order.status}
                        </span>
                      </span>
                      <span className="col-span-2 text-[11px] text-muted-foreground text-right">
                        {format(new Date(order.created_at), "dd MMM", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-6 pb-8 text-center">
                <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum pedido recente</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div className="lg:col-span-2" {...fadeUp(9)}>
          <div className="admin-card p-6 h-full flex flex-col">
            <h3 className="text-base font-semibold text-foreground mb-1">Ações Rápidas</h3>
            <p className="text-xs text-muted-foreground mb-5">Gerencie sua loja</p>

            <div className="space-y-1 flex-1">
              {[
                { label: "Novo Produto", icon: Plus, path: "/admin/produtos/novo" },
                { label: "Ver Pedidos", icon: ShoppingCart, path: "/admin/pedidos" },
                { label: "Clientes", icon: Users, path: "/admin/clientes" },
                { label: "Cupons", icon: Receipt, path: "/admin/cupons" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <action.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    {action.label}
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>

            {/* Alerts section */}
            {(stats.pendingOrders > 0 || stats.lowStockProducts > 0) && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">Alertas</p>
                {stats.pendingOrders > 0 && (
                  <div
                    onClick={() => navigate("/admin/pedidos")}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100 cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      {stats.pendingOrders} pedido(s) aguardando processamento
                    </p>
                  </div>
                )}
                {stats.lowStockProducts > 0 && (
                  <div
                    onClick={() => navigate("/admin/produtos")}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100 cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-red-700 leading-relaxed">
                      {stats.lowStockProducts} produto(s) com estoque baixo
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
