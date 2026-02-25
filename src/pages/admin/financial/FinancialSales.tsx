import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialFilters } from "@/hooks/useFinancialFilters";
import { PeriodFilter } from "@/components/admin/financial/PeriodFilter";
import { KpiCard } from "@/components/admin/financial/KpiCard";
import { formatBRL, exportToCsv } from "@/lib/exportCsv";
import { Download, ExternalLink, ShoppingBag, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function FinancialSales() {
  const filters = useFinancialFilters("30d");
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      const { from, to } = filters.dateRange;
      const { data } = await supabase.from("orders").select("*, order_items(*)").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false });
      setOrders(data || []);
    };
    fetch();
  }, [filters.dateRange]);

  const filtered = orders.filter(o => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (paymentFilter !== "all" && o.payment_status !== paymentFilter) return false;
    return true;
  });

  const totalRevenue = filtered.filter(o => o.payment_status === "paid").reduce((s, o) => s + Number(o.total), 0);
  const avgTicket = filtered.length > 0 ? totalRevenue / filtered.filter(o => o.payment_status === "paid").length || 0 : 0;

  const handleExport = () => {
    const rows = filtered.map(o => ({
      Data: format(new Date(o.created_at), "dd/MM/yyyy"),
      Pedido: o.order_number,
      Cliente: o.customer_name || "-",
      "Status Pagamento": o.payment_status,
      "Status Pedido": o.status,
      "Forma Pagamento": o.payment_method || "-",
      Subtotal: Number(o.subtotal).toFixed(2),
      Desconto: Number(o.discount).toFixed(2),
      Frete: Number(o.shipping_cost || o.shipping_price || 0).toFixed(2),
      Total: Number(o.total).toFixed(2),
    }));
    exportToCsv("vendas-financeiro", rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Vendas</h1>
          <p className="text-muted-foreground text-sm">Pedidos e receita detalhados</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter {...filters} />
          <Button variant="outline" size="sm" className="rounded-xl" onClick={handleExport}><Download className="w-4 h-4 mr-1" />CSV</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <KpiCard title="Receita Paga" value={formatBRL(totalRevenue)} icon={DollarSign} color="text-emerald-600" index={0} />
        <KpiCard title="Pedidos" value={filtered.length} icon={ShoppingBag} color="text-primary" index={1} />
        <KpiCard title="Ticket Médio" value={formatBRL(avgTicket)} icon={TrendingUp} color="text-accent" index={2} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] rounded-xl border-0 bg-muted/30"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="processing">Processando</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[160px] rounded-xl border-0 bg-muted/30"><SelectValue placeholder="Pagamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Pagamentos</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="refunded">Reembolsado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card">
          <CardContent className="p-0">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Data</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Pedido</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Pagamento</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Forma</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Subtotal</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Desc.</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Frete</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Total</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => (
                    <tr key={o.id} className="border-b hover:bg-muted/10 transition-colors">
                      <td className="p-3">{format(new Date(o.created_at), "dd/MM/yy")}</td>
                      <td className="p-3 font-mono text-xs">#{o.order_number}</td>
                      <td className="p-3">{o.customer_name || "-"}</td>
                      <td className="p-3">
                        <span className={`admin-status-pill ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : o.payment_status === "refunded" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {o.payment_status}
                        </span>
                      </td>
                      <td className="p-3 text-xs">{o.payment_method || "-"}</td>
                      <td className="p-3 text-right">{formatBRL(Number(o.subtotal))}</td>
                      <td className="p-3 text-right text-amber-600">{Number(o.discount) > 0 ? `-${formatBRL(Number(o.discount))}` : "-"}</td>
                      <td className="p-3 text-right">{formatBRL(Number(o.shipping_cost || o.shipping_price || 0))}</td>
                      <td className="p-3 text-right font-semibold">{formatBRL(Number(o.total))}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/pedidos`)}><ExternalLink className="w-3.5 h-3.5" /></Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Nenhum pedido encontrado no período</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y">
              {filtered.map(o => (
                <div key={o.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">#{o.order_number}</span>
                    <span className={`admin-status-pill ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {o.payment_status}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{o.customer_name || "Anônimo"}</span>
                    <span className="font-semibold">{formatBRL(Number(o.total))}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
