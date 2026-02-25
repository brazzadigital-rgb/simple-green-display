import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  payment_method: string | null;
  payment_status: string;
  created_at: string;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "default" },
  shipped: { label: "Enviado", variant: "default" },
  delivered: { label: "Entregue", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, total, payment_method, payment_status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <p className="font-display text-xl mb-1">Nenhum pedido</p>
        <p className="text-muted-foreground font-sans text-sm mb-6">Você ainda não fez nenhum pedido</p>
        <Button asChild className="rounded-xl font-sans"><Link to="/">Explorar produtos</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold mb-4">Meus Pedidos</h2>
      {orders.map(order => {
        const st = statusLabels[order.status] || statusLabels.pending;
        return (
          <Card key={order.id} className="border-0 shadow-premium hover:shadow-premium-lg transition-shadow">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-sans text-sm font-bold">{order.order_number}</span>
                  <Badge variant={st.variant} className="text-xs font-sans">{st.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-sans">
                  {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
                <p className="font-sans text-sm font-semibold">R$ {Number(order.total).toFixed(2)}</p>
              </div>
              <Link to={`/conta/pedidos/${order.id}`}>
                <Button variant="outline" size="sm" className="rounded-xl font-sans gap-2">
                  <Eye className="w-4 h-4" /> Detalhes
                </Button>
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
