import { Skeleton } from "@/components/ui/skeleton";
import { useOwnerInvoices } from "@/hooks/useOwnerSubscription";
import { Receipt, Eye, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const statusMap: Record<string, { label: string; dot: string; cls: string }> = {
  pending:  { label: "Pendente",  dot: "bg-amber-500",   cls: "bg-amber-50 text-amber-700" },
  paid:     { label: "Pago",      dot: "bg-emerald-500", cls: "bg-emerald-50 text-emerald-700" },
  expired:  { label: "Expirado",  dot: "bg-red-500",     cls: "bg-red-50 text-red-700" },
  canceled: { label: "Cancelado", dot: "bg-slate-400",   cls: "bg-slate-50 text-slate-500" },
  refunded: { label: "Estornado", dot: "bg-blue-500",    cls: "bg-blue-50 text-blue-700" },
};

export default function OwnerInvoices() {
  const { data: invoices, isLoading } = useOwnerInvoices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Faturas</h1>
        <p className="text-slate-400 text-sm mt-1">Histórico de cobranças do sistema</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-6 pt-6 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-emerald-600">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Todas as Faturas</h3>
          </div>

          {isLoading ? (
            <div className="px-6 pb-6 space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : invoices && invoices.length > 0 ? (
            <div className="px-4 pb-4">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                <span className="col-span-1">Nº</span>
                <span className="col-span-2">Criação</span>
                <span className="col-span-2">Vencimento</span>
                <span className="col-span-2">Valor</span>
                <span className="col-span-2">Método</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-1 text-right">Ação</span>
              </div>
              <div className="space-y-1">
                {invoices.map((inv: any, idx: number) => {
                  const st = statusMap[inv.status] || statusMap.pending;
                  return (
                    <div
                      key={inv.id}
                      className="grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-xl transition-colors duration-150 hover:bg-slate-50"
                    >
                      <span className="col-span-1 text-xs text-slate-400 font-mono">{idx + 1}.</span>
                      <span className="col-span-2 text-xs text-slate-500">{format(new Date(inv.created_at), "dd MMM yy", { locale: ptBR })}</span>
                      <span className="col-span-2 text-xs text-slate-500">{format(new Date(inv.due_at), "dd MMM yy", { locale: ptBR })}</span>
                      <span className="col-span-2 text-sm font-semibold text-slate-800">{formatBRL(Number(inv.amount))}</span>
                      <span className="col-span-2 text-xs text-slate-400">{inv.payment_method || "Pix"}</span>
                      <span className="col-span-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </span>
                      <span className="col-span-1 flex justify-end gap-1">
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {inv.status === "pending" && (
                          <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="px-6 pb-12 text-center">
              <Receipt className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Nenhuma fatura encontrada</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
