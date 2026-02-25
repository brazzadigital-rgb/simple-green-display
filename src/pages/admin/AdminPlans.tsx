import { useState } from "react";
import { usePlans, type Plan } from "@/hooks/useSubscription";
import { useOwnerSubscription } from "@/hooks/useOwnerSubscription";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, Crown, Loader2, Copy, CheckCircle2, QrCode, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { toast } from "sonner";

type Cycle = "monthly" | "semiannual" | "annual";
const cycleLabels: Record<Cycle, string> = { monthly: "Mensal", semiannual: "Semestral", annual: "Anual" };
const cycleSuffix: Record<Cycle, string> = { monthly: "/mês", semiannual: "/6 meses", annual: "/12 meses" };
const cycleKey: Record<Cycle, string> = { monthly: "monthly", semiannual: "semiannual", annual: "annual" };

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function getPrice(plan: Plan, cycle: Cycle) {
  if (cycle === "semiannual") return plan.semiannual_price;
  if (cycle === "annual") return plan.annual_price;
  return plan.monthly_price;
}

function getMonthlyBase(plan: Plan) {
  return plan.monthly_price;
}

function getSavings(plan: Plan, cycle: Cycle) {
  if (cycle === "monthly") return 0;
  const months = cycle === "semiannual" ? 6 : 12;
  const monthlyTotal = plan.monthly_price * months;
  const cyclePrice = getPrice(plan, cycle);
  return Math.round(((monthlyTotal - cyclePrice) / monthlyTotal) * 100);
}

const statsItems = [
  { label: "Pedidos/mês", value: "Ilimitados" },
  { label: "Produtos", value: "Ilimitados" },
  { label: "Gateways", value: "5+" },
  { label: "Admins", value: "Ilimitados" },
];

const extraBadges = ["Analytics", "RBAC", "Multi-gateway", "UTM"];

export default function AdminPlans() {
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: sub, isLoading: subLoading } = useOwnerSubscription();
  const queryClient = useQueryClient();
  const isSuspended = sub?.status === "suspended" || sub?.status === "past_due";

  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    cycle: Cycle;
    plan: Plan | null;
    loading: boolean;
    qrCode: string | null;
    qrImage: string | null;
    txid: string | null;
    copied: boolean;
  }>({
    open: false,
    cycle: "monthly",
    plan: null,
    loading: false,
    qrCode: null,
    qrImage: null,
    txid: null,
    copied: false,
  });

  const isLoading = plansLoading || subLoading;
  const plan = plans?.[0];
  const cycles: Cycle[] = ["monthly", "semiannual", "annual"];

  const handleAcquire = async (selectedPlan: Plan, cycle: Cycle) => {
    setPaymentModal({
      open: true,
      cycle,
      plan: selectedPlan,
      loading: true,
      qrCode: null,
      qrImage: null,
      txid: null,
      copied: false,
    });

    try {
      const amount = getPrice(selectedPlan, cycle);

      // 1. Generate invoice
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const invoiceRes = await supabase.functions.invoke("owner-efi-charge", {
        body: {
          action: "generate_invoice",
          amount,
          plan_id: selectedPlan.id,
          billing_cycle: cycle,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (invoiceRes.error || !invoiceRes.data?.success) {
        throw new Error(invoiceRes.data?.error || "Erro ao gerar fatura");
      }

      const invoiceId = invoiceRes.data.invoice.id;

      // 2. Create PIX charge
      const chargeRes = await supabase.functions.invoke("owner-efi-charge", {
        body: {
          action: "create_charge",
          amount,
          description: `Plano ${selectedPlan.name} - ${cycleLabels[cycle]}`,
          invoice_id: invoiceId,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (chargeRes.error || !chargeRes.data?.success) {
        throw new Error(chargeRes.data?.error || "Erro ao criar cobrança PIX");
      }

      // Cycle will only change when payment is confirmed via webhook

      setPaymentModal((prev) => ({
        ...prev,
        loading: false,
        qrCode: chargeRes.data.qr_code,
        qrImage: chargeRes.data.qr_image,
        txid: chargeRes.data.txid,
      }));
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar pagamento");
      setPaymentModal((prev) => ({ ...prev, open: false, loading: false }));
    }
  };

  const handleCopy = () => {
    if (paymentModal.qrCode) {
      navigator.clipboard.writeText(paymentModal.qrCode);
      setPaymentModal((prev) => ({ ...prev, copied: true }));
      toast.success("Código PIX copiado!");
      setTimeout(() => setPaymentModal((prev) => ({ ...prev, copied: false })), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Plano e Assinatura</h1>
          <p className="text-slate-400 text-sm mt-1">Escolha o ciclo ideal para sua operação</p>
        </div>
        {sub?.plan && (
          <Badge variant="outline" className="text-xs px-3 py-1.5 rounded-full border-primary/30 text-primary font-medium self-start">
            Plano atual: {sub.plan.name} ({cycleLabels[sub.billing_cycle as Cycle]})
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[520px] rounded-2xl" />)}
        </div>
      ) : plan ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {cycles.map((c, idx) => {
            const savings = getSavings(plan, c);
            const total = getPrice(plan, c);
            const isCurrent = sub?.plan_id === plan.id && sub?.billing_cycle === c;
            const isRecommended = c === "semiannual";

            return (
              <motion.div
                key={c}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`relative admin-card overflow-hidden flex flex-col border-2 ${
                  isRecommended ? "!border-emerald-500 shadow-md" : ""
                }`}
              >
                {isRecommended && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
                      Recomendado
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className={`absolute top-3 ${isRecommended ? 'left-3' : 'right-3'} z-10`}>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      Atual
                    </span>
                  </div>
                )}

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Crown className="w-4.5 h-4.5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base">{cycleLabels[c]}</h3>
                      <p className="text-[11px] text-muted-foreground">{cycleKey[c]}</p>
                    </div>
                  </div>

                  <div className="mt-4 mb-1">
                    <span className="text-3xl font-black text-foreground">{formatBRL(total)}</span>
                    <span className="text-sm text-muted-foreground ml-1">{cycleSuffix[c]}</span>
                  </div>

                  {savings > 0 ? (
                    <div className="space-y-1 mb-3">
                      <p className="text-xs text-primary font-semibold">
                        {savings}% de desconto · Base: {formatBRL(getMonthlyBase(plan))}/mês
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Equivale a <span className="font-bold text-foreground">{formatBRL(total / (c === "semiannual" ? 6 : 12))}/mês</span>
                      </p>
                      <p className="text-xs font-bold text-emerald-600">
                        🎉 Economia de {formatBRL(plan.monthly_price * (c === "semiannual" ? 6 : 12) - total)} ({savings}% off)
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mb-3">Plano mensal sem desconto</p>
                  )}

                  <p className="text-xs text-muted-foreground mb-4">
                    {savings > 0
                      ? `Plano ${cycleLabels[c].toLowerCase()} com ${savings}% de desconto`
                      : plan.description || "Controle total para operações profissionais."}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {statsItems.map(s => (
                      <div key={s.label} className="bg-muted/50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                        <p className="text-sm font-bold text-foreground">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 mb-5 flex-1">
                    {((plan.features_json || []) as string[]).map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground/80">{f}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-5">
                    {extraBadges.map(b => (
                      <span key={b} className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
                        {b}
                      </span>
                    ))}
                  </div>

                  {isCurrent && !isSuspended ? (
                    <div className="w-full rounded-xl h-10 font-semibold mt-auto flex items-center justify-center bg-primary/10 text-primary text-sm">
                      ✓ Ciclo ativo
                    </div>
                  ) : isCurrent && isSuspended ? (
                    <Button
                      onClick={() => handleAcquire(plan, c)}
                      className="w-full mt-auto rounded-xl h-10 font-semibold bg-amber-600 hover:bg-amber-500 text-white"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Renovar
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleAcquire(plan, c)}
                      className="w-full mt-auto rounded-xl h-10 font-semibold"
                      variant={isRecommended ? "default" : "outline"}
                    >
                      {sub?.plan_id === plan.id ? "Alterar ciclo" : "Adquirir"}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="admin-card p-12 text-center">
          <p className="text-sm text-slate-400">Nenhum plano configurado</p>
        </div>
      )}

      {/* Payment Modal */}
      <Dialog open={paymentModal.open} onOpenChange={(open) => setPaymentModal((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-2 border-emerald-100 rounded-2xl bg-white [&>button]:h-6 [&>button]:w-6 [&>button]:top-5 [&>button]:right-5">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 pt-6 pb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Pagamento via PIX</h3>
              <p className="text-[11px] text-slate-400">Escaneie o QR Code ou copie o código</p>
            </div>
          </div>

          {paymentModal.loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-sm text-slate-400">Gerando cobrança PIX…</p>
            </div>
          ) : paymentModal.qrImage || paymentModal.qrCode ? (
            <div className="flex flex-col items-center gap-4 px-6 pb-6">
              {/* Plan + Price badge */}
              <div className="w-full flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] font-medium text-slate-400">{paymentModal.plan?.name}</p>
                  <p className="text-base font-bold text-slate-800">{cycleLabels[paymentModal.cycle]}</p>
                </div>
                <span className="text-sm font-bold bg-emerald-500 text-white px-4 py-1.5 rounded-full">
                  {paymentModal.plan ? formatBRL(getPrice(paymentModal.plan, paymentModal.cycle)) : "—"}
                </span>
              </div>

              {/* QR Code */}
              {paymentModal.qrImage && (
                <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-emerald-200 inline-flex items-center justify-center">
                  <img
                    src={paymentModal.qrImage}
                    alt="QR Code PIX"
                    className="w-44 h-44 max-w-full object-contain"
                  />
                </div>
              )}

              {/* Copy paste */}
              {paymentModal.qrCode && (
                <div className="w-full space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PIX Copia e Cola</p>
                  <div className="relative bg-slate-50 rounded-xl p-3 pr-12">
                    <p className="text-[11px] text-slate-500 font-mono break-all leading-relaxed line-clamp-4">
                      {paymentModal.qrCode}
                    </p>
                    <button
                      onClick={handleCopy}
                      className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors"
                      title="Copiar código"
                    >
                      {paymentModal.copied ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Awaiting confirmation */}
              <div className="flex items-center gap-2 pt-1">
                <Clock className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <p className="text-xs text-slate-400">Aguardando confirmação do pagamento</p>
              </div>
            </div>
          ) : (
            <div className="py-12 px-6 text-center">
              <p className="text-sm text-slate-400">Não foi possível gerar o QR Code. Tente novamente.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}