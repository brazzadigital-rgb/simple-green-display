import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Truck, DollarSign, ShoppingCart, Target, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useHideValues, BLUR_CLASS } from "@/hooks/useHideValues";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/admin/financial/KpiCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminReports() {
  const { hidden, toggle } = useHideValues();
  const { data: sellers = [], isLoading: ls } = useQuery({
    queryKey: ["report-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sellers").select("*").eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers = [], isLoading: lsup } = useQuery({
    queryKey: ["report-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["report-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commissions").select("*, sellers(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["report-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, total, seller_id, status, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["report-products-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, supplier_id, is_active");
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const loading = ls || lsup;

  const sellerStats = sellers.map(s => {
    const sellerOrders = orders.filter(o => o.seller_id === s.id);
    const totalSold = sellerOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const sellerComms = commissions.filter(c => c.seller_id === s.id);
    const totalComm = sellerComms.reduce((sum, c) => sum + Number(c.commission_amount), 0);
    const ticket = sellerOrders.length > 0 ? totalSold / sellerOrders.length : 0;
    return { ...s, totalSold, orderCount: sellerOrders.length, totalComm, ticket };
  });

  const supplierStats = suppliers.map(s => {
    const prodCount = products.filter(p => p.supplier_id === s.id && p.is_active).length;
    return { ...s, prodCount, shippingDays: s.shipping_days || 0 };
  });

  const totalCommPaid = commissions.filter(c => c.payment_status === "paid").reduce((s, c) => s + Number(c.commission_amount), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios de Performance</h1>
          <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Visão geral da equipe e fornecedores</p>
        </div>
        <Button variant="ghost" size="icon" onClick={toggle} className="shrink-0">
          {hidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </Button>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Vendedores Ativos" value={sellers.length} icon={Users} color="text-accent" index={0} isMoney={false} />
        <KpiCard title="Fornecedores Ativos" value={suppliers.length} icon={Truck} color="text-primary" index={1} isMoney={false} />
        <KpiCard title="Comissões Pagas" value={formatCurrency(totalCommPaid)} icon={DollarSign} color="text-emerald-600" index={2} />
        <KpiCard title="Total Pedidos" value={orders.length} icon={ShoppingCart} color="text-amber-600" index={3} isMoney={false} />
      </div>

      {/* Seller performance */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="space-y-3">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" /> Performance dos Vendedores
          </h2>
          <Card className="admin-card overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vendedor</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total Vendido</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Pedidos</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Ticket Médio</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Comissão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerStats.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">
                          <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                          Nenhum vendedor ativo
                        </td></tr>
                      ) : sellerStats.map(s => (
                        <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium">{s.name}</td>
                          <td className={`px-4 py-3 text-right ${hidden ? BLUR_CLASS : ""}`}>{formatCurrency(s.totalSold)}</td>
                          <td className="px-4 py-3 text-right hidden md:table-cell">{s.orderCount}</td>
                          <td className={`px-4 py-3 text-right hidden md:table-cell ${hidden ? BLUR_CLASS : ""}`}>{formatCurrency(s.ticket)}</td>
                          <td className={`px-4 py-3 text-right font-semibold text-accent ${hidden ? BLUR_CLASS : ""}`}>{formatCurrency(s.totalComm)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Supplier performance */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="space-y-3">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <Truck className="w-5 h-5 text-accent" /> Performance dos Fornecedores
          </h2>
          <Card className="admin-card overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fornecedor</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Produtos Ativos</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Prazo Envio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierStats.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-10 text-muted-foreground">
                          <Truck className="w-10 h-10 mx-auto mb-2 opacity-20" />
                          Nenhum fornecedor ativo
                        </td></tr>
                      ) : supplierStats.map(s => (
                        <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium">{s.trade_name}</td>
                          <td className="px-4 py-3 text-right">{s.prodCount}</td>
                          <td className="px-4 py-3 text-right">{s.shippingDays > 0 ? `${s.shippingDays} dias` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
