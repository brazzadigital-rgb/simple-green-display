import { Skeleton } from "@/components/ui/skeleton";
import { useOwnerAuditLogs } from "@/hooks/useOwnerSubscription";
import { Shield, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

export default function OwnerAudit() {
  const { data: logs, isLoading } = useOwnerAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Auditoria</h1>
        <p className="text-slate-400 text-sm mt-1">Registro de ações do sistema</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-6 pt-6 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-emerald-600">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Logs de Auditoria</h3>
          </div>

          {isLoading ? (
            <div className="px-6 pb-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="px-4 pb-4 space-y-1.5">
              {logs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 rounded-xl transition-colors duration-150 hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{log.action}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {log.actor_type} • {log.ip || "—"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 ml-4 font-mono">
                    {format(new Date(log.created_at), "dd MMM · HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 pb-12 text-center">
              <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Nenhum registro de auditoria</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
