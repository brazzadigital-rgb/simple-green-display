import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useOwnerSubscription, useOwnerInvoices } from "@/hooks/useOwnerSubscription";
import { usePlans } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  CreditCard, CalendarClock, AlertTriangle, CheckCircle2, Clock, XCircle,
  Receipt, RefreshCw, Ban, Play, Loader2, TrendingUp,
  Activity, Eye, Send, ArrowUpRight, DollarSign, BarChart3, Zap
} from "lucide-react";
import { format, differenceInDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

/* ─── Status config ─── */
const statusConfig: Record<string, { label: string; color: string; bgClass: string; icon: any }> = {
  active:    { label: "Ativo",        color: "#10b981", bgClass: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
  trialing:  { label: "Teste",        color: "#3b82f6", bgClass: "bg-blue-50 text-blue-700 border-blue-100", icon: Clock },
  past_due:  { label: "Inadimplente", color: "#f59e0b", bgClass: "bg-amber-50 text-amber-700 border-amber-100", icon: AlertTriangle },
  canceled:  { label: "Cancelada",    color: "#94a3b8", bgClass: "bg-slate-50 text-slate-600 border-slate-200", icon: XCircle },
  suspended: { label: "Suspenso",     color: "#ef4444", bgClass: "bg-red-50 text-red-700 border-red-100", icon: Ban },
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

/* ─── Periods ─── */
const periods = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "12m", label: "12 meses" },
];

/* ─── Chart tooltip ─── */
function ChartTooltipCustom({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-[11px] text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold text-slate-800">
          {p.name}: {formatBRL(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ─── Animated number ─── */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>();
  useEffect(() => {
    const dur = 700;
    const start = display;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setDisplay(start + (value - start) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value]);
  return <>{formatBRL(display)}</>;
}

export default function OwnerDashboard() {
  const { data: sub, isLoading: subLoading } = useOwnerSubscription();
  const { data: invoices, isLoading: invLoading } = useOwnerInvoices();
  const { data: plans } = usePlans();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [period, setPeriod] = useState("30d");

  const status = sub?.status || "active";
  const sc = statusConfig[status] || statusConfig.active;
  const StatusIcon = sc.icon;
  const isLoading = subLoading || invLoading;

  const pendingInvoices = invoices?.filter((i: any) => i.status === "pending") || [];
  const paidInvoices = invoices?.filter((i: any) => i.status === "paid") || [];

  const nextRenewal = sub?.current_period_end
    ? format(new Date(sub.current_period_end), "dd MMM yyyy", { locale: ptBR })
    : "—";
  const daysUntilRenewal = sub?.current_period_end
    ? differenceInDays(new Date(sub.current_period_end), new Date())
    : null;

  const planName = sub?.plan?.name || "Sem plano";
  const totalReceived = paidInvoices.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const receivedMonth = paidInvoices
    .filter((i: any) => i.paid_at && differenceInDays(new Date(), new Date(i.paid_at)) <= 30)
    .reduce((s: number, i: any) => s + Number(i.amount), 0);

  /* Chart data */
  const revenueChartData = (() => {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
    const result: { date: string; receita: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, days > 90 ? "MMM yy" : "dd/MM", { locale: ptBR });
      const dayPaid = paidInvoices
        .filter((inv: any) => inv.paid_at && format(new Date(inv.paid_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd"))
        .reduce((s: number, inv: any) => s + Number(inv.amount), 0);
      result.push({ date: key, receita: dayPaid });
    }
    if (days > 90) {
      const grouped: Record<string, number> = {};
      result.forEach(r => { grouped[r.date] = (grouped[r.date] || 0) + r.receita; });
      return Object.entries(grouped).map(([date, receita]) => ({ date, receita }));
    }
    return result;
  })();

  const invokeAction = async (action: string, extra?: any) => {
    setActionLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("owner-efi-charge", {
        body: { action, ...extra },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "Ação executada com sucesso" });
        qc.invalidateQueries({ queryKey: ["owner-subscription"] });
        qc.invalidateQueries({ queryKey: ["owner-invoices"] });
        qc.invalidateQueries({ queryKey: ["owner-audit-logs"] });
        qc.invalidateQueries({ queryKey: ["system-suspended"] });
      } else {
        toast({ title: "Erro", description: data?.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const fadeUp = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35 } },
  });

  /* ─── KPI definitions ─── */
  const kpis = [
    { label: "Receita Total", value: isLoading ? null : formatBRL(totalReceived), icon: DollarSign, trend: "+12%", trendUp: true, sub: "Período anterior" },
    { label: "Receita Mês", value: isLoading ? null : formatBRL(receivedMonth), icon: BarChart3, sub: `${paidInvoices.length} faturas pagas` },
    { label: "Próxima Cobrança", value: isLoading ? null : nextRenewal, icon: CalendarClock, sub: daysUntilRenewal !== null && daysUntilRenewal >= 0 ? `em ${daysUntilRenewal} dias` : "" },
    { label: "Faturas Pendentes", value: isLoading ? null : String(pendingInvoices.length), icon: Receipt, sub: pendingInvoices.length > 0 ? formatBRL(pendingInvoices.reduce((s: number, i: any) => s + Number(i.amount), 0)) : "Nenhuma pendente" },
    { label: "Status", value: null, icon: StatusIcon, isBadge: true },
  ];

  return (
    <div className="space-y-6">
      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeUp(i)}>
            <div className="group bg-white rounded-2xl border border-slate-100 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200 cursor-default">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{kpi.label}</span>
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <kpi.icon className="w-4 h-4" />
                </div>
              </div>

              {kpi.isBadge ? (
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full border ${sc.bgClass}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {sc.label}
                  </span>
                </div>
              ) : kpi.value === null ? (
                <Skeleton className="h-7 w-24 rounded-lg" />
              ) : (
                <p className="text-xl font-bold text-slate-800 tracking-tight">{kpi.value}</p>
              )}

              {kpi.trend && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-600">{kpi.trend}</span>
                  <span className="text-[10px] text-slate-400 ml-0.5">{kpi.sub}</span>
                </div>
              )}
              {!kpi.trend && kpi.sub && (
                <p className="text-[11px] text-slate-400 mt-2">{kpi.sub}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ CENTER — Chart + Status ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <motion.div className="lg:col-span-2" {...fadeUp(5)}>
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Receita</h3>
                <p className="text-xs text-slate-400 mt-0.5">Pagamentos recebidos no período</p>
              </div>
              <div className="flex gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
                {periods.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      period === p.key
                        ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-xl" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="ownerRevenueGrad" x1="0" y1="0" x2="0" y2="1">
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
                      dataKey="receita"
                      name="Receita"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#ownerRevenueGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </motion.div>

        {/* Status cards */}
        <motion.div {...fadeUp(6)}>
          <div className="bg-white rounded-2xl border border-slate-100 p-6 h-full flex flex-col">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Sistema</h3>
            <p className="text-xs text-slate-400 mb-5">Informações da assinatura</p>

            <div className="space-y-3 flex-1">
              {/* Status badge */}
              <div className="flex items-center justify-center py-4">
                <span className={`inline-flex items-center gap-2 text-base font-bold px-5 py-2.5 rounded-2xl border ${sc.bgClass}`}>
                  <StatusIcon className="w-5 h-5" />
                  {sc.label}
                </span>
              </div>

              {/* Info rows */}
              {[
                { label: "Plano atual", value: isLoading ? null : planName },
                { label: "Próximo vencimento", value: isLoading ? null : nextRenewal },
                { label: "Método de pagamento", value: "Pix (Efí)" },
                { label: "Ciclo", value: isLoading ? null : (sub?.billing_cycle === "annual" ? "Anual" : sub?.billing_cycle === "semiannual" ? "Semestral" : "Mensal") },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-400">{row.label}</span>
                  {row.value === null ? (
                    <Skeleton className="h-4 w-20 rounded" />
                  ) : (
                    <span className="text-xs font-semibold text-slate-700">{row.value}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Alerts */}
            {status === "past_due" && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100 mt-4">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-700 leading-relaxed">Pagamento em atraso. Regularize para evitar suspensão.</p>
              </div>
            )}
            {status === "suspended" && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100 mt-4">
                <Ban className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-red-700 leading-relaxed">Sistema suspenso por inadimplência.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ═══ BOTTOM — Invoices + Quick Actions ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Invoices table */}
        <motion.div className="lg:col-span-3" {...fadeUp(7)}>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Faturas Recentes</h3>
                <p className="text-xs text-slate-400 mt-0.5">Últimos registros de cobrança</p>
              </div>
              <button
                onClick={() => navigate("/owner/invoices")}
                className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-emerald-600 transition-colors"
              >
                Ver todas <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {isLoading ? (
              <div className="px-6 pb-6 space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
              </div>
            ) : invoices && invoices.length > 0 ? (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                  <span className="col-span-1">Nº</span>
                  <span className="col-span-3">Data</span>
                  <span className="col-span-2">Valor</span>
                  <span className="col-span-2">Status</span>
                  <span className="col-span-2 hidden sm:block">Método</span>
                  <span className="col-span-2 text-right">Ações</span>
                </div>
                <div className="space-y-1">
                  {invoices.slice(0, 5).map((inv: any, idx: number) => (
                    <div
                      key={inv.id}
                      className="grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-xl transition-colors duration-150 hover:bg-slate-50"
                    >
                      <span className="col-span-1 text-xs text-slate-400 font-mono">
                        {idx + 1}.
                      </span>
                      <span className="col-span-3 text-xs text-slate-500">
                        {format(new Date(inv.due_at), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                      <span className="col-span-2 text-sm font-semibold text-slate-800">
                        {formatBRL(Number(inv.amount))}
                      </span>
                      <span className="col-span-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inv.status === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : inv.status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-50 text-slate-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            inv.status === "paid" ? "bg-emerald-500" : inv.status === "pending" ? "bg-amber-500" : "bg-slate-400"
                          }`} />
                          {inv.status === "paid" ? "Pago" : inv.status === "pending" ? "Pendente" : inv.status}
                        </span>
                      </span>
                      <span className="col-span-2 hidden sm:block text-xs text-slate-400">
                        {inv.payment_method || "Pix"}
                      </span>
                      <span className="col-span-2 flex justify-end gap-1">
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {inv.status === "pending" && (
                          <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-6 pb-10 text-center">
                <Receipt className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Nenhuma fatura encontrada</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div className="lg:col-span-2" {...fadeUp(8)}>
          <div className="bg-white rounded-2xl border border-slate-100 p-6 h-full">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Ações Rápidas</h3>
            <p className="text-xs text-slate-400 mb-5">Gerencie seu sistema</p>

            <div className="space-y-2">
              {[
                {
                  label: "Gerar Nova Cobrança",
                  icon: Receipt,
                  action: () => invokeAction("generate_invoice", { amount: sub?.plan?.monthly_price || 0 }),
                  loading: actionLoading === "generate_invoice",
                  variant: "default" as const,
                },
                {
                  label: "Alterar Plano",
                  icon: RefreshCw,
                  action: () => navigate("/owner/plans"),
                  variant: "default" as const,
                },
                {
                  label: "Pagamentos",
                  icon: CreditCard,
                  action: () => navigate("/owner/invoices"),
                  variant: "default" as const,
                },
                ...(status !== "suspended"
                  ? [{
                      label: "Suspender Sistema",
                      icon: Ban,
                      action: () => invokeAction("suspend_system"),
                      loading: actionLoading === "suspend_system",
                      variant: "danger" as const,
                    }]
                  : [{
                      label: "Reativar Sistema",
                      icon: Play,
                      action: () => invokeAction("reactivate_system"),
                      loading: actionLoading === "reactivate_system",
                      variant: "success" as const,
                    }]
                ),
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  disabled={btn.loading}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                    btn.variant === "danger"
                      ? "text-red-500 border-red-100 hover:bg-red-50"
                      : btn.variant === "success"
                      ? "text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                      : "text-slate-600 border-slate-100 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {btn.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <btn.icon className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-left">{btn.label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-30" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
