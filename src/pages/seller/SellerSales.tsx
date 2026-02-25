import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingBag, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function SellerSales() {
  const { sellerId } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!sellerId) return;
    supabase.from("orders")
      .select("id, order_number, total, status, created_at, customer_name, customer_email, payment_status, referral_code")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { setOrders((data as any[]) || []); setLoading(false); });
  }, [sellerId]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.order_number?.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-60 rounded-2xl" /></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold">Minhas Vendas</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">{orders.length} vendas realizadas</p>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por pedido ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl h-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 rounded-xl h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="processing">Processando</SelectItem>
            <SelectItem value="shipped">Enviado</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="canceled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-sans">Nenhuma venda encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead><tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Pedido</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">Cliente</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Total</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">Data</th>
                </tr></thead>
                <tbody>
                  {filtered.map(o => (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{o.order_number}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{o.customer_name || "—"}</td>
                      <td className="px-4 py-3">{fmt(Number(o.total))}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{o.status}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
