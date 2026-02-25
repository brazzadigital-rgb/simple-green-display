import { usePlans, type Plan } from "@/hooks/useSubscription";
import { useOwnerSubscription, useOwnerInvoices } from "@/hooks/useOwnerSubscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check, Crown, ShoppingCart, Package, Truck, MapPin,
  BarChart3, Star, Zap, Headphones, Receipt, CreditCard,
  CalendarDays, Sparkles, ArrowRight, Shield, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Cycle = "monthly" | "semiannual" | "annual";
const cycleLabels: Record<Cycle, string> = { monthly: "Mensal", semiannual: "Semestral", annual: "Anual" };
const cycleSuffix: Record<Cycle, string> = { monthly: "/mês", semiannual: "/semestre", annual: "/ano" };

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function getPrice(plan: Plan, cycle: Cycle) {
  if (cycle === "semiannual") return plan.semiannual_price;
  if (cycle === "annual") return plan.annual_price;
  return plan.monthly_price;
}

function getSavings(plan: Plan, cycle: Cycle) {
  if (cycle === "monthly") return 0;
  const months = cycle === "semiannual" ? 6 : 12;
  const monthlyTotal = plan.monthly_price * months;
  const cyclePrice = getPrice(plan, cycle);
  return Math.round(((monthlyTotal - cyclePrice) / monthlyTotal) * 100);
}

function getSavingsAmount(plan: Plan, cycle: Cycle) {
  if (cycle === "monthly") return 0;
  const months = cycle === "semiannual" ? 6 : 12;
  const monthlyTotal = plan.monthly_price * months;
  return monthlyTotal - getPrice(plan, cycle);
}

const featureIcons = [Zap, Package, Truck, MapPin, BarChart3, Star, Zap, Headphones];

const statusMap: Record<string, { label: string; color: string; dot: string }> = {
  active: { label: "Ativa", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
  trial: { label: "Teste", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  suspended: { label: "Suspensa", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-400" },
  canceled: { label: "Cancelada", color: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
};

const invoiceStatusMap: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "Pago", color: "text-emerald-700", bg: "bg-emerald-50" },
  pending: { label: "Pendente", color: "text-amber-700", bg: "bg-amber-50" },
  overdue: { label: "Atrasado", color: "text-red-700", bg: "bg-red-50" },
};

export default function AdminSubscription() {
  const { data: sub, isLoading: subLoading } = useOwnerSubscription();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: invoices, isLoading: invoicesLoading } = useOwnerInvoices();

  const isLoading = subLoading || plansLoading;
  const plan = sub?.plan as Plan | undefined;
  const cycle = (sub?.billing_cycle || "monthly") as Cycle;
  const allPlans = plans || [];
  const currentPlan = allPlans[0];
  const cycles: Cycle[] = ["monthly", "semiannual", "annual"];
  const status = statusMap[sub?.status || "active"] || statusMap.active;
  const savings = plan ? getSavings(plan, cycle) : 0;

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yy", { locale: ptBR }); } catch { return "—"; }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-2xl flex items-center justify-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.05))",
              border: "1px solid hsl(var(--primary) / 0.15)",
            }}
            animate={{ rotate: [0, 3, -3, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Crown className="w-6 h-6 text-primary" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Assinatura</h1>
            <p className="text-sm text-slate-400 mt-0.5">Gerencie seu plano, ciclo e pagamentos</p>
          </div>
        </div>
        <Badge className={`${status.color} border text-xs px-4 py-1.5 rounded-full font-semibold inline-flex items-center gap-1.5 self-start`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${status.dot}`} />
          {status.label}
        </Badge>
      </motion.div>

      {isLoading ? (
        <div className="space-y-5">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Current Plan Overview */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="relative overflow-hidden rounded-2xl"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.06) 0%, hsl(var(--primary) / 0.02) 50%, hsl(var(--primary) / 0.05) 100%)",
              border: "1px solid hsl(var(--primary) / 0.12)",
            }}
          >
            {/* Decorative background elements */}
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-[0.04]"
              style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }} />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full opacity-[0.03]"
              style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }} />

            <div className="relative p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Plan name & price */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--primary) / 0.08))",
                      boxShadow: "0 4px 16px hsl(var(--primary) / 0.1)",
                    }}
                  >
                    <Crown className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1">Plano Atual</p>
                    <h2 className="text-xl font-bold text-foreground">{plan?.name || "Nenhum plano"}</h2>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-black text-foreground">
                        {plan ? formatBRL(getPrice(plan, cycle)) : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">{cycleSuffix[cycle]}</span>
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-center px-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Ciclo</p>
                    <p className="text-sm font-bold text-foreground">{cycleLabels[cycle]}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200 hidden sm:block" />
                  <div className="text-center px-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Início</p>
                    <p className="text-sm font-bold text-foreground">{formatDate(sub?.current_period_start)}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200 hidden sm:block" />
                  <div className="text-center px-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Vencimento</p>
                    <p className="text-sm font-bold text-foreground">{formatDate(sub?.current_period_end)}</p>
                  </div>
                  {savings > 0 && (
                    <>
                      <div className="w-px h-8 bg-slate-200 hidden sm:block" />
                      <div className="text-center px-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Economia</p>
                        <p className="text-sm font-bold text-primary">{savings}%</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Features Included */}
          {plan && (plan.features_json as string[] || []).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="admin-card p-6"
            >
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Recursos Incluídos</h3>
                  <p className="text-[11px] text-muted-foreground">Tudo que seu plano oferece</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {((plan.features_json || []) as string[]).map((f, i) => {
                  const Icon = featureIcons[i % featureIcons.length];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 + i * 0.03 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/60 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/12 transition-colors">
                        <Icon className="w-4 h-4 text-primary/70" />
                      </div>
                      <span className="text-sm text-foreground/80">{f}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Available Plans — Cycle Comparison */}
          {currentPlan && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Ciclos Disponíveis</h3>
                  <p className="text-[11px] text-muted-foreground">Compare e escolha o melhor para você</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {cycles.map((c, idx) => {
                  const total = getPrice(currentPlan, c);
                  const savingsPercent = getSavings(currentPlan, c);
                  const savingsAmt = getSavingsAmount(currentPlan, c);
                  const isCurrent = sub?.billing_cycle === c;
                  const isPopular = c === "semiannual";

                  return (
                    <motion.div
                      key={c}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 + idx * 0.07, type: "spring", stiffness: 300, damping: 24 }}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      className={`relative admin-card p-6 flex flex-col transition-shadow duration-300 ${
                        isCurrent
                          ? "ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/5"
                          : isPopular
                            ? "ring-2 ring-primary/20 shadow-md shadow-primary/5"
                            : "hover:shadow-md"
                      }`}
                    >
                      {/* Badges */}
                      {isPopular && !isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.4, type: "spring" }}
                            className="text-[10px] font-bold px-4 py-1 rounded-full bg-primary text-primary-foreground whitespace-nowrap inline-flex items-center gap-1 shadow-sm"
                          >
                            <Sparkles className="w-3 h-3" /> Mais Popular
                          </motion.span>
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <span className="text-[10px] font-bold px-4 py-1 rounded-full bg-emerald-500 text-white whitespace-nowrap inline-flex items-center gap-1 shadow-sm">
                            <Check className="w-3 h-3" /> Atual
                          </span>
                        </div>
                      )}

                      {/* Cycle Label */}
                      <div className="text-center mt-2 mb-4">
                        <h4 className="font-bold text-foreground text-base">{cycleLabels[c]}</h4>
                        {savingsPercent > 0 && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 + idx * 0.07 }}
                            className="text-[10px] font-bold text-primary bg-primary/8 px-2.5 py-0.5 rounded-full inline-block mt-1"
                          >
                            {savingsPercent}% off
                          </motion.span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-center mb-4">
                        <span className="text-3xl font-black text-foreground">{formatBRL(total)}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{cycleSuffix[c]}</p>
                        {savingsAmt > 0 && (
                          <p className="text-[11px] text-emerald-600 font-medium mt-1">
                            Economia de {formatBRL(savingsAmt)}
                          </p>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-2.5 flex-1 mb-5">
                        {((currentPlan.features_json || []) as string[]).slice(0, 5).map((f, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-emerald-600" />
                            </div>
                            <span className="text-xs text-foreground/70 leading-relaxed">{f}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA */}
                      <div className="mt-auto">
                        {isCurrent ? (
                          <div className="w-full rounded-xl h-11 font-semibold flex items-center justify-center bg-emerald-50 text-emerald-700 text-sm border border-emerald-200 gap-1.5">
                            <Check className="w-4 h-4" /> Plano Atual
                          </div>
                        ) : (
                          <Button
                            className="w-full rounded-xl h-11 text-sm font-semibold gap-1.5 group/btn"
                            variant={isPopular ? "default" : "outline"}
                            onClick={() => window.location.href = "/admin/planos"}
                          >
                            Mudar para {cycleLabels[c]}
                            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Payment History */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="admin-card overflow-hidden"
          >
            <div className="p-6 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Histórico de Pagamentos</h3>
                  <p className="text-[11px] text-muted-foreground">{invoices?.length || 0} registros</p>
                </div>
              </div>
            </div>

            {invoicesLoading ? (
              <div className="px-6 pb-6 space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : invoices && invoices.length > 0 ? (
              <div className="px-6 pb-4">
                {/* Desktop table */}
                <div className="hidden sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data</th>
                        <th className="text-left py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Método</th>
                        <th className="text-right py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor</th>
                        <th className="text-right py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.slice(0, 10).map((inv: any, i: number) => {
                        const st = invoiceStatusMap[inv.status] || invoiceStatusMap.pending;
                        return (
                          <motion.tr
                            key={inv.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.28 + i * 0.03 }}
                            className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="py-3 text-sm text-foreground flex items-center gap-2">
                              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                              {formatDate(inv.created_at)}
                            </td>
                            <td className="py-3 text-sm text-muted-foreground capitalize">
                              {inv.payment_method || inv.gateway || "—"}
                            </td>
                            <td className="py-3 text-right text-sm font-semibold text-foreground">
                              {formatBRL(inv.amount)}
                            </td>
                            <td className="py-3 text-right">
                              <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${st.bg} ${st.color}`}>
                                {st.label}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {invoices.slice(0, 10).map((inv: any) => {
                    const st = invoiceStatusMap[inv.status] || invoiceStatusMap.pending;
                    return (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{formatBRL(inv.amount)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.created_at)}</p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${st.bg} ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                  <CreditCard className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Nenhum pagamento registrado</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Os pagamentos aparecerão aqui</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
