import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Clock, Package, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import TrackingProgressBar from "./TrackingProgressBar";

interface OrderInfo {
  order_number: string;
  status: string;
  shipment_status: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  shipping_method: string | null;
  shipping_days: number | null;
  created_at: string;
  customer_name: string | null;
}

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
  pending: { label: "Pendente", icon: <Clock className="w-3 h-3" /> },
  confirmed: { label: "Confirmado", icon: <Check className="w-3 h-3" /> },
  processing: { label: "Em preparo", icon: <Package className="w-3 h-3" /> },
  shipped: { label: "Enviado", icon: <Truck className="w-3 h-3" /> },
  in_transit: { label: "Em trânsito", icon: <Truck className="w-3 h-3" /> },
  delivered: { label: "Entregue", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: "Falha", icon: <AlertCircle className="w-3 h-3" /> },
};

interface Props {
  order: OrderInfo;
}

export default function TrackingStatusCard({ order }: Props) {
  const [copied, setCopied] = useState(false);
  const statusKey = order.shipment_status || order.status;
  const statusInfo = STATUS_MAP[statusKey] || STATUS_MAP.pending;

  const copyTracking = () => {
    if (order.tracking_code) {
      navigator.clipboard.writeText(order.tracking_code);
      setCopied(true);
      toast({ title: "✨ Código copiado!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-card rounded-2xl border border-[hsl(30,20%,90%)] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.06)] p-5 md:p-7 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.08)] transition-shadow duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(30,30%,55%)] mb-1">
            Pedido
          </p>
          <p className="font-display text-xl font-bold text-foreground">{order.order_number}</p>
          {order.customer_name && (
            <p className="font-sans text-sm text-muted-foreground mt-0.5">{order.customer_name}</p>
          )}
        </div>
        <Badge className="bg-[hsl(30,30%,25%)] text-[hsl(36,40%,95%)] font-sans text-[11px] gap-1.5 px-3 py-1.5 rounded-full border-0 hover:bg-[hsl(30,30%,20%)]">
          {statusInfo.icon} {statusInfo.label}
        </Badge>
      </div>

      {/* Progress bar */}
      <TrackingProgressBar currentStatus={statusKey} />

      {/* Tracking code */}
      {order.tracking_code && (
        <div className="mt-5 p-3.5 rounded-xl bg-[hsl(30,20%,96%)] border border-[hsl(30,20%,90%)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Código de rastreio
            </p>
            <p className="font-sans text-sm font-bold font-mono tracking-wider truncate text-foreground">
              {order.tracking_code}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyTracking}
            className="shrink-0 rounded-xl h-9 w-9 hover:bg-[hsl(30,20%,90%)] active:scale-95 transition-all"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[hsl(142,71%,45%)]" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      )}

      {/* Shipping info */}
      {order.shipping_method && (
        <p className="font-sans text-xs text-muted-foreground mt-4">
          Transportadora: <span className="font-medium text-foreground/70">{order.shipping_method}</span>
          {order.shipping_days ? (
            <> · Prazo: <span className="font-medium text-foreground/70">{order.shipping_days} dias úteis</span></>
          ) : null}
        </p>
      )}
    </motion.div>
  );
}
