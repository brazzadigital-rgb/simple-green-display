import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useHideValues, BLUR_CLASS } from "@/hooks/useHideValues";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  subtitle?: string;
  index?: number;
  isMoney?: boolean;
}

export function KpiCard({ title, value, icon: Icon, color = "text-accent", subtitle, index = 0, isMoney = true }: KpiCardProps) {
  const { hidden } = useHideValues();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="shadow-premium border-0 hover:shadow-premium-lg transition-shadow duration-300">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-sans text-muted-foreground uppercase tracking-wide truncate">{title}</p>
              <p className={`text-xl font-bold font-sans mt-1 truncate ${isMoney && hidden ? BLUR_CLASS : ""}`}>{value}</p>
              {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
