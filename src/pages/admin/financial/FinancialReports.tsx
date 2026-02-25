import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialFilters } from "@/hooks/useFinancialFilters";
import { PeriodFilter } from "@/components/admin/financial/PeriodFilter";
import { exportToCsv } from "@/lib/exportCsv";
import { Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, eachDayOfInterval } from "date-fns";
import { motion } from "framer-motion";

const reports = [
  { id: "sales_daily", name: "Vendas por Dia", desc: "Receita e pedidos diários" },
  { id: "sales_product", name: "Vendas por Produto", desc: "Performance detalhada por produto" },
  { id: "profit_product", name: "Lucro por Produto", desc: "COGS, lucro e margem" },
  { id: "refunds_reason", name: "Reembolsos por Motivo", desc: "Motivos e valores" },
  { id: "commissions_seller", name: "Comissões por Vendedor", desc: "Pendentes e pagas" },
  { id: "conciliation_gw", name: "Conciliação por Gateway", desc: "Taxas e líquido recebido" },
];

export default function FinancialReports() {
  const filters = useFinancialFilters("30d");
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const generate = async (reportId: string) => {
    setLoading(reportId);
    const { from, to } = filters.dateRange;
    try {
      switch (reportId) {
        case "sales_daily": {
          const { data } = await supabase.from("orders").select("*").gte("created_at", from).lte("created_at", to);
          const paid = (data || []).filter(o => o.payment_status === "paid");
          const days = eachDayOfInterval({ start: filters.dateRange.fromDate, end: filters.dateRange.toDate });
          const rows = days.map(d => {
            const key = format(d, "yyyy-MM-dd");
            const dayOrders = paid.filter(o => format(new Date(o.created_at), "yyyy-MM-dd") === key);
            return { Data: format(d, "dd/MM/yyyy"), Pedidos: dayOrders.length, Receita: dayOrders.reduce((s, o) => s + Number(o.total), 0).toFixed(2) };
          });
          exportToCsv("vendas-diarias", rows);
          break;
        }
        case "sales_product": {
          const { data } = await supabase.from("order_items").select("*, orders!inner(created_at, payment_status)").gte("orders.created_at", from).lte("orders.created_at", to);
          const paid = (data || []).filter(i => (i as any).orders?.payment_status === "paid");
          const map: Record<string, any> = {};
          paid.forEach(i => {
            const k = i.product_name;
            if (!map[k]) map[k] = { Produto: k, Unidades: 0, Receita: 0 };
            map[k].Unidades += Number(i.quantity);
            map[k].Receita += Number(i.total_price);
          });
          exportToCsv("vendas-produto", Object.values(map).map(r => ({ ...r, Receita: r.Receita.toFixed(2) })));
          break;
        }
        case "refunds_reason": {
          const { data } = await supabase.from("refunds").select("*").gte("created_at", from).lte("created_at", to);
          exportToCsv("reembolsos", (data || []).map(r => ({
            Data: format(new Date(r.created_at), "dd/MM/yyyy"), Valor: Number(r.amount).toFixed(2),
            Motivo: r.reason || "-", Tipo: r.refund_type, Chargeback: r.is_chargeback ? "Sim" : "Não", Status: r.status,
          })));
          break;
        }
        case "commissions_seller": {
          const [comRes, selRes] = await Promise.all([
            supabase.from("commissions").select("*").gte("created_at", from).lte("created_at", to),
            supabase.from("sellers").select("id, name"),
          ]);
          const sellers: Record<string, string> = {};
          (selRes.data || []).forEach(s => { sellers[s.id] = s.name; });
          exportToCsv("comissoes-vendedor", (comRes.data || []).map(c => ({
            Vendedor: sellers[c.seller_id] || c.seller_id, Venda: Number(c.sale_amount).toFixed(2),
            "Taxa %": c.commission_rate, Comissão: Number(c.commission_amount).toFixed(2), Status: c.payment_status,
          })));
          break;
        }
        case "conciliation_gw": {
          const { data } = await supabase.from("financial_transactions").select("*").gte("created_at", from).lte("created_at", to);
          exportToCsv("conciliacao-gateway", (data || []).map(t => ({
            Gateway: t.gateway, Valor: Number(t.amount).toFixed(2), Taxas: Number(t.fees).toFixed(2),
            Líquido: Number(t.net_amount).toFixed(2), Status: t.status,
          })));
          break;
        }
        default:
          toast({ title: "Relatório não disponível ainda" });
      }
      toast({ title: "Relatório exportado", variant: "default" });
    } catch {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    }
    setLoading(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Relatórios e Exportações</h1>
          <p className="text-muted-foreground text-sm">Exporte dados financeiros em CSV</p>
        </div>
        <PeriodFilter {...filters} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="admin-card hover:shadow-premium-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold font-sans">{r.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                  </div>
                  <FileSpreadsheet className="w-5 h-5 text-accent shrink-0" />
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full rounded-xl" onClick={() => generate(r.id)} disabled={loading === r.id}>
                  <Download className="w-4 h-4 mr-1" />{loading === r.id ? "Gerando…" : "Exportar CSV"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
