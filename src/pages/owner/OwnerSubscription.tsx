import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useOwnerSubscription } from "@/hooks/useOwnerSubscription";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, CheckCircle2, Clock, AlertTriangle, Ban, XCircle, RefreshCw, HeartCrack, PartyPopper } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; bgClass: string; icon: any }> = {
  active:    { label: "Ativa",        bgClass: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
  trialing:  { label: "Teste",        bgClass: "bg-blue-50 text-blue-700 border-blue-100", icon: Clock },
  past_due:  { label: "Inadimplente", bgClass: "bg-amber-50 text-amber-700 border-amber-100", icon: AlertTriangle },
  canceled:  { label: "Cancelada",    bgClass: "bg-slate-50 text-slate-600 border-slate-200", icon: XCircle },
  suspended: { label: "Suspensa",     bgClass: "bg-red-50 text-red-700 border-red-100", icon: Ban },
};

const cycleLabels: Record<string, string> = {
  monthly: "Mensal",
  semiannual: "Semestral",
  annual: "Anual",
};

export default function OwnerSubscription() {
  const { data: sub, isLoading } = useOwnerSubscription();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);
  const [showReactivate, setShowReactivate] = useState(false);
  const [processing, setProcessing] = useState(false);

  const status = sub?.status || "active";
  const isCanceled = status === "canceled" || status === "suspended";
  const sc = statusConfig[status] || statusConfig.active;
  const StatusIcon = sc.icon;
  const planName = sub?.plan?.name || "Sem plano";

  const fields = [
    { label: "Plano", value: planName },
    { label: "Ciclo", value: cycleLabels[sub?.billing_cycle] || "—" },
    { label: "Início do período", value: sub?.current_period_start ? format(new Date(sub.current_period_start), "dd/MM/yyyy", { locale: ptBR }) : "—" },
    { label: "Fim do período", value: sub?.current_period_end ? format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: ptBR }) : "—" },
    { label: "Renovação automática", value: sub?.auto_renew ? "Sim" : "Não" },
    { label: "Gateway", value: sub?.gateway || "Efí" },
  ];

  const handleCancel = async () => {
    if (!sub?.id) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("owner_subscription" as any)
        .update({
          status: "suspended",
          auto_renew: false,
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["owner-subscription"] });
      qc.invalidateQueries({ queryKey: ["system-suspended"] });
      toast.success("Assinatura cancelada");
      setShowCancel(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao cancelar");
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivate = async () => {
    if (!sub?.id) return;
    setProcessing(true);
    try {
      const months = sub.billing_cycle === "monthly" ? 1 : sub.billing_cycle === "semiannual" ? 6 : 12;
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + months);

      const { error } = await supabase
        .from("owner_subscription" as any)
        .update({
          status: "active",
          auto_renew: true,
          cancel_at_period_end: false,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["owner-subscription"] });
      qc.invalidateQueries({ queryKey: ["system-suspended"] });
      toast.success("Assinatura reativada com sucesso!");
      setShowReactivate(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao reativar");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Assinatura</h1>
        <p className="text-slate-400 text-sm mt-1">Detalhes da assinatura do sistema</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          {/* Suspended/Canceled banner */}
          {isCanceled && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-5 text-center">
              <HeartCrack className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-red-700 mb-1">Assinatura suspensa</h3>
              <p className="text-sm text-red-600 mb-4 max-w-md mx-auto">
                O acesso às funcionalidades do sistema está desativado. Reative sua assinatura para voltar a usar todos os recursos.
              </p>
              <Button
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                onClick={() => setShowReactivate(true)}
              >
                <PartyPopper className="w-4 h-4 mr-2" />
                Reativar Assinatura
              </Button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-emerald-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Assinatura Atual</h3>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border mt-1 ${sc.bgClass}`}>
                  <StatusIcon className="w-3 h-3" />
                  {sc.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {fields.map(f => (
                <div key={f.label} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">{f.label}</p>
                  <p className="text-sm font-semibold text-slate-800">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              {!isCanceled && (
                <>
                  <Button
                    className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm"
                    onClick={() => navigate("/owner/plans")}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Trocar Plano
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setShowCancel(true)}
                  >
                    Cancelar Assinatura
                  </Button>
                </>
              )}
              {isCanceled && (
                <Button
                  className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  onClick={() => setShowReactivate(true)}
                >
                  <PartyPopper className="w-4 h-4 mr-2" />
                  Reativar Assinatura
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent className="rounded-2xl max-w-md text-center">
          <DialogHeader className="items-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-2">
              <HeartCrack className="w-8 h-8 text-red-400" />
            </div>
            <DialogTitle className="text-slate-800 text-lg">Tem certeza que deseja cancelar?</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm mt-2">
              Ao cancelar sua assinatura, <strong>todas as funcionalidades do sistema serão desativadas</strong> imediatamente.
              Seus dados serão mantidos e você poderá reativar a qualquer momento.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 my-2 text-left">
            <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ O que será afetado:</p>
            <ul className="text-xs text-amber-600 space-y-1 list-disc list-inside">
              <li>Painel administrativo ficará inacessível</li>
              <li>Loja online ficará fora do ar</li>
              <li>Notificações e automações serão pausadas</li>
            </ul>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-11"
              onClick={() => setShowCancel(false)}
            >
              Manter assinatura
            </Button>
            <Button
              className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-500 text-white"
              disabled={processing}
              onClick={handleCancel}
            >
              {processing ? "Cancelando..." : "Sim, cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate confirmation dialog */}
      <Dialog open={showReactivate} onOpenChange={setShowReactivate}>
        <DialogContent className="rounded-2xl max-w-md text-center">
          <DialogHeader className="items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
              <PartyPopper className="w-8 h-8 text-emerald-500" />
            </div>
            <DialogTitle className="text-slate-800 text-lg">Reativar assinatura</DialogTitle>
            <DialogDescription className="text-slate-500 text-sm mt-2">
              Que bom ter você de volta! 🎉 Ao reativar, todas as funcionalidades do sistema serão restauradas imediatamente.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-11"
              onClick={() => setShowReactivate(false)}
            >
              Voltar
            </Button>
            <Button
              className="flex-1 rounded-xl h-11 bg-emerald-600 hover:bg-emerald-500 text-white"
              disabled={processing}
              onClick={handleReactivate}
            >
              {processing ? "Reativando..." : "Reativar agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
