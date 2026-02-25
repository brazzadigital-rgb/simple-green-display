import { useState } from "react";
import { Crown, AlertTriangle, Gem, Sparkles, QrCode, Copy, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePlans, type Plan } from "@/hooks/useSubscription";
import { useOwnerSubscription } from "@/hooks/useOwnerSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Cycle = "monthly" | "semiannual" | "annual";
const cycleLabels: Record<Cycle, string> = { monthly: "Mensal", semiannual: "Semestral", annual: "Anual" };

function getPrice(plan: Plan, cycle: Cycle) {
  if (cycle === "semiannual") return plan.semiannual_price;
  if (cycle === "annual") return plan.annual_price;
  return plan.monthly_price;
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

/**
 * Full-page premium suspension screen with inline PIX payment modal.
 */
export function SystemSuspendedFullPage() {
  const navigate = useNavigate();
  const { data: plans } = usePlans();
  const { data: sub } = useOwnerSubscription();

  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    cycle: Cycle;
    plan: Plan | null;
    loading: boolean;
    qrCode: string | null;
    qrImage: string | null;
    copied: boolean;
  }>({ open: false, cycle: "monthly", plan: null, loading: false, qrCode: null, qrImage: null, copied: false });

  const handleRegularize = async () => {
    const plan = plans?.[0];
    if (!plan) {
      toast.error("Nenhum plano disponível");
      return;
    }

    const cycle: Cycle = (sub?.billing_cycle as Cycle) || "monthly";

    setPaymentModal({ open: true, cycle, plan, loading: true, qrCode: null, qrImage: null, copied: false });

    try {
      const amount = getPrice(plan, cycle);

      // Helper to extract data from edge function response (handles non-2xx)
      const invokeEfi = async (body: Record<string, unknown>) => {
        const res = await supabase.functions.invoke("owner-efi-charge", { body });
        // On non-2xx, error is FunctionsHttpError and data may contain the error body
        if (res.error) {
          // Try to get error detail from response context
          let detail = "";
          try {
            const ctx = (res.error as any)?.context;
            if (ctx && typeof ctx.json === "function") {
              const errBody = await ctx.json();
              detail = errBody?.error || "";
            }
          } catch { /* ignore */ }
          throw new Error(detail || res.error.message || "Erro de conexão");
        }
        return res.data;
      };

      const invoiceData = await invokeEfi({
        action: "generate_invoice", amount, plan_id: plan.id, billing_cycle: cycle,
      });

      if (!invoiceData?.success) throw new Error(invoiceData?.error || "Erro ao gerar fatura");

      const chargeData = await invokeEfi({
        action: "create_charge",
        amount,
        description: `Plano ${plan.name} - ${cycleLabels[cycle]}`,
        invoice_id: invoiceData.invoice.id,
      });

      if (!chargeData?.success) throw new Error(chargeData?.error || "Erro ao criar cobrança PIX");

      setPaymentModal(prev => ({
        ...prev,
        loading: false,
        qrCode: chargeData.qr_code,
        qrImage: chargeData.qr_image,
      }));
    } catch (err: any) {
      console.error("[Regularizar] Error:", err);
      toast.error(err.message || "Erro ao processar pagamento");
      setPaymentModal(prev => ({ ...prev, open: false, loading: false }));
    }
  };

  const handleCopy = () => {
    if (paymentModal.qrCode) {
      navigator.clipboard.writeText(paymentModal.qrCode);
      setPaymentModal(prev => ({ ...prev, copied: true }));
      toast.success("Código PIX copiado!");
      setTimeout(() => setPaymentModal(prev => ({ ...prev, copied: false })), 3000);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-lg w-full text-center space-y-8"
      >
        {/* Decorative gem icon */}
        <div className="relative mx-auto w-24 h-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-amber-300/40"
          />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center shadow-lg shadow-amber-100/40">
            <Gem className="w-10 h-10 text-amber-600" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="w-5 h-5 text-amber-400" />
          </motion.div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-amber-800 to-slate-800 bg-clip-text text-transparent">
            Assinatura Pendente
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto">
            Sua assinatura expirou e o acesso às funcionalidades do painel está temporariamente
            desabilitado. Regularize para voltar a gerenciar sua joalheria com todo o brilho. ✨
          </p>
        </div>

        {/* Status card */}
        <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 border border-amber-200/60 rounded-2xl p-5 mx-auto max-w-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-amber-800">O que está desabilitado:</p>
          </div>
          <ul className="text-xs text-amber-700/80 space-y-1.5 text-left pl-11">
            <li>• Gestão de produtos e estoque</li>
            <li>• Processamento de pedidos</li>
            <li>• Configurações da loja</li>
            <li>• Relatórios e financeiro</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={handleRegularize}
            className="h-12 px-8 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold shadow-lg shadow-amber-200/50 transition-all"
          >
            <Crown className="w-4 h-4 mr-2" />
            Regularizar Assinatura
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/planos")}
            className="h-12 px-6 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Ver planos
          </Button>
        </div>

        <p className="text-[11px] text-slate-400">
          Após o pagamento, o sistema será reativado automaticamente.
        </p>
      </motion.div>

      {/* PIX Payment Modal */}
      <Dialog open={paymentModal.open} onOpenChange={(open) => setPaymentModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-2 border-amber-100 rounded-2xl bg-white [&>button]:h-6 [&>button]:w-6 [&>button]:top-5 [&>button]:right-5">
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
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
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
                <span className="text-sm font-bold bg-amber-500 text-white px-4 py-1.5 rounded-full">
                  {paymentModal.plan ? formatBRL(getPrice(paymentModal.plan, paymentModal.cycle)) : "—"}
                </span>
              </div>

              {paymentModal.qrImage && (
                <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-amber-200 inline-flex items-center justify-center">
                  <img src={paymentModal.qrImage} alt="QR Code PIX" className="w-44 h-44 max-w-full object-contain" />
                </div>
              )}

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

              <div className="flex items-center gap-2 pt-1">
                <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
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

/**
 * Compact top banner shown inside AdminLayout when suspended
 */
export function SystemSuspendedTopBanner() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200/60 px-4 py-2.5 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <p className="text-xs font-medium text-amber-800 truncate">
          <span className="font-bold">Assinatura suspensa</span>
          <span className="hidden sm:inline"> — regularize para desbloquear todas as funcionalidades</span>
        </p>
      </div>
      <Button
        size="sm"
        onClick={() => navigate("/admin/planos")}
        className="h-7 px-3 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white flex-shrink-0"
      >
        <Crown className="w-3 h-3 mr-1" />
        Regularizar
      </Button>
    </motion.div>
  );
}

/**
 * @deprecated Use SystemSuspendedFullPage or SystemSuspendedTopBanner instead
 */
export function SystemSuspendedBanner() {
  return <SystemSuspendedFullPage />;
}
