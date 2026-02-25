import { motion } from "framer-motion";
import { Check, Package, Truck, Home, Clock } from "lucide-react";

const STEPS = [
  { key: "confirmed", label: "Confirmado", icon: Check },
  { key: "processing", label: "Preparando", icon: Package },
  { key: "shipped", label: "Postado", icon: Package },
  { key: "in_transit", label: "Em trânsito", icon: Truck },
  { key: "delivered", label: "Entregue", icon: Home },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  in_transit: 4,
  out_for_delivery: 4,
  delivered: 5,
};

interface Props {
  currentStatus: string;
}

export default function TrackingProgressBar({ currentStatus }: Props) {
  const currentIndex = STATUS_ORDER[currentStatus] ?? 0;

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        {/* Connector line */}
        <div className="absolute top-[18px] left-[24px] right-[24px] h-px bg-[hsl(30,20%,88%)]" />
        <motion.div
          className="absolute top-[18px] left-[24px] h-px bg-gradient-to-r from-[hsl(30,40%,65%)] to-[hsl(30,50%,75%)]"
          initial={{ width: 0 }}
          animate={{
            width: `${Math.min(((currentIndex - 1) / (STEPS.length - 1)) * 100, 100)}%`,
          }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        />

        {STEPS.map((step, i) => {
          const stepIndex = i + 1;
          const isActive = currentIndex >= stepIndex;
          const isCurrent = currentIndex === stepIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center z-10 relative">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? "bg-[hsl(30,30%,25%)] text-[hsl(36,40%,95%)]"
                    : "bg-[hsl(30,20%,93%)] text-muted-foreground/40"
                } ${isCurrent ? "ring-2 ring-[hsl(30,40%,70%)]/40 ring-offset-2 ring-offset-card" : ""}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </motion.div>
              <span
                className={`font-sans text-[10px] mt-2 font-medium transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground/50"
                }`}
              >
                {step.label}
              </span>
              {isCurrent && (
                <motion.div
                  layoutId="step-glow"
                  className="absolute -top-1 w-11 h-11 rounded-full bg-[hsl(30,40%,70%)]/10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
