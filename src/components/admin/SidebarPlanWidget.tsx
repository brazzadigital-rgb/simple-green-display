import { useOwnerSubscription } from "@/hooks/useOwnerSubscription";
import { useNavigate } from "react-router-dom";
import { Crown, AlertCircle, Clock, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string; color: string; icon: any; dotColor: string }> = {
  active: { label: "Ativo", color: "bg-emerald-500/15 text-emerald-600", icon: null, dotColor: "bg-emerald-400" },
  trialing: { label: "Teste", color: "bg-amber-500/15 text-amber-600", icon: Clock, dotColor: "bg-amber-400" },
  past_due: { label: "Atraso", color: "bg-red-500/15 text-red-600", icon: AlertCircle, dotColor: "bg-red-400" },
  suspended: { label: "Suspenso", color: "bg-red-500/15 text-red-600", icon: AlertCircle, dotColor: "bg-red-400" },
  canceled: { label: "Cancelado", color: "bg-muted text-muted-foreground", icon: null, dotColor: "bg-slate-400" },
};

const cycleLabel: Record<string, string> = { monthly: "mês", semiannual: "semestre", annual: "ano" };

function daysLeft(dateStr: string) {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
}

export function SidebarPlanWidget() {
  const { data: sub, isLoading } = useOwnerSubscription();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  if (isLoading) {
    return collapsed ? null : (
      <div className="px-3 pb-2">
        <Skeleton className="h-[88px] rounded-2xl" />
      </div>
    );
  }

  const plan = sub?.plan;
  const status = sub?.status || "active";
  const cfg = statusConfig[status] || statusConfig.active;

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/admin/planos")}
              className="relative flex items-center justify-center w-full py-2 text-primary hover:bg-muted/40 rounded-xl transition-colors"
            >
              <Crown className="w-5 h-5" />
              <span className={cn("absolute top-1 right-2 w-2 h-2 rounded-full animate-pulse", cfg.dotColor)} />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{plan ? `${plan.name} — ${cfg.label}` : "Ver planos"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const price = plan
    ? sub.billing_cycle === "semiannual"
      ? plan.semiannual_price
      : sub.billing_cycle === "annual"
        ? plan.annual_price
        : plan.monthly_price
    : null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={() => navigate("/admin/planos")}
      className="relative mx-3 mb-2 p-4 rounded-2xl text-left w-[calc(100%-1.5rem)] overflow-hidden group"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03), hsl(var(--primary) / 0.06))",
        border: "1px solid hsl(var(--primary) / 0.15)",
        boxShadow: "0 2px 12px hsl(var(--primary) / 0.06)",
      }}
    >

      {/* Floating sparkle */}
      <motion.div
        className="absolute top-2 right-2 text-primary/20"
        animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 0.9, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkles className="w-4 h-4" />
      </motion.div>

      {/* Header row */}
      <div className="flex items-center justify-between mb-2 relative z-10">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold">Seu plano</span>
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", cfg.color)}>
          <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", cfg.dotColor)} />
          {cfg.label}
        </span>
      </div>

      {plan ? (
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-1.5">
            <motion.div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.08))",
              }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Crown className="w-4 h-4 text-primary" />
            </motion.div>
            <div>
              <p className="font-bold text-sm text-foreground leading-tight">{plan.name}</p>
              <p className="text-[11px] text-muted-foreground">
                R$ {price?.toFixed(2).replace(".", ",")}
                <span className="text-muted-foreground/60"> / {cycleLabel[sub.billing_cycle] || "mês"}</span>
              </p>
            </div>
          </div>

          {status === "trialing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] text-amber-600 mt-2 font-semibold flex items-center gap-1 bg-amber-50 rounded-lg px-2 py-1"
            >
              <Clock className="w-3 h-3" />
              {daysLeft(sub.current_period_end)} dias restantes
            </motion.div>
          )}
          {status === "past_due" && (
            <motion.div
              animate={{ x: [0, 2, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[10px] text-red-500 mt-2 font-semibold flex items-center gap-1 bg-red-50 rounded-lg px-2 py-1"
            >
              <AlertCircle className="w-3 h-3" />
              Regularize seu plano →
            </motion.div>
          )}
          {status === "suspended" && (
            <motion.div
              animate={{ x: [0, 2, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[10px] text-red-500 mt-2 font-semibold flex items-center gap-1 bg-red-50 rounded-lg px-2 py-1"
            >
              <AlertCircle className="w-3 h-3" />
              Assinatura suspensa →
            </motion.div>
          )}
          {status === "active" && sub.current_period_end && (
            <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              Renova em {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 relative z-10">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.08))" }}
          >
            <Crown className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Escolher plano</p>
            <p className="text-[10px] text-muted-foreground">Desbloqueie recursos</p>
          </div>
        </div>
      )}
    </motion.button>
  );
}
