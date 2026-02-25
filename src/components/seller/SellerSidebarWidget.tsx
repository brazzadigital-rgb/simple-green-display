import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Clock, Sparkles, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useHideValues, BLUR_CLASS } from "@/hooks/useHideValues";

export function SellerSidebarWidget() {
  const { sellerId } = useAuth();
  const navigate = useNavigate();
  const { hidden, toggle } = useHideValues();

  const { data, isLoading } = useQuery({
    queryKey: ["seller-widget", sellerId],
    queryFn: async () => {
      if (!sellerId) return null;

      const [sellerRes, commissionsRes] = await Promise.all([
        supabase.from("sellers").select("name, commission_rate").eq("id", sellerId).maybeSingle(),
        supabase.from("commissions").select("commission_amount, payment_status").eq("seller_id", sellerId),
      ]);

      const comms = (commissionsRes.data as any[]) || [];
      const totalCommission = comms.reduce((a, c) => a + Number(c.commission_amount), 0);
      const pending = comms.filter(c => c.payment_status === "pending").reduce((a, c) => a + Number(c.commission_amount), 0);
      const paid = comms.filter(c => c.payment_status === "paid").reduce((a, c) => a + Number(c.commission_amount), 0);
      const available = totalCommission - paid - pending;

      return {
        name: sellerRes.data?.name || "Vendedor",
        rate: sellerRes.data?.commission_rate || 0,
        totalCommission,
        pending,
        available,
      };
    },
    enabled: !!sellerId,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) return <div className="px-3 pb-2"><Skeleton className="h-[88px] rounded-2xl" /></div>;
  if (!data) return null;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const blurIf = hidden ? BLUR_CLASS : "";

  return (
    <div
      className="relative mx-3 mb-2 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.03), hsl(var(--primary) / 0.06))",
        border: "1px solid hsl(var(--primary) / 0.15)",
        boxShadow: "0 2px 12px hsl(var(--primary) / 0.06)",
      }}
    >
      {/* Eye toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        title={hidden ? "Mostrar valores" : "Ocultar valores"}
      >
        {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>

      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => navigate("/vendedor/comissoes")}
        className="p-4 text-left w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2 relative z-10 pr-5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold">Suas Comissões</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {data.rate}%
          </span>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-1.5">
            <motion.div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.08))" }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <DollarSign className="w-4 h-4 text-primary" />
            </motion.div>
            <div>
              <p className={`font-bold text-sm text-foreground leading-tight ${blurIf}`}>{fmt(data.totalCommission)}</p>
              <p className="text-[11px] text-muted-foreground">acumulado total</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {data.available > 0 && (
              <div className={`text-[10px] font-semibold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg px-2 py-1 ${blurIf}`}>
                <TrendingUp className="w-3 h-3" />
                {fmt(data.available)} disponível
              </div>
            )}
            {data.pending > 0 && (
              <div className={`text-[10px] font-semibold flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg px-2 py-1 ${blurIf}`}>
                <Clock className="w-3 h-3" />
                {fmt(data.pending)} pendente
              </div>
            )}
            {data.totalCommission === 0 && (
              <div className="text-[10px] text-muted-foreground">
                Comece a vender para acumular comissões
              </div>
            )}
          </div>
        </div>
      </motion.button>
    </div>
  );
}
