import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function SellerCommissions() {
  const { sellerId } = useAuth();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    supabase.from("commissions").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => { setCommissions((data as any[]) || []); setLoading(false); });
  }, [sellerId]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-60 rounded-2xl" /></div>;

  const total = commissions.reduce((a, c) => a + Number(c.commission_amount), 0);
  const paid = commissions.filter(c => c.payment_status === "paid").reduce((a, c) => a + Number(c.commission_amount), 0);
  const pending = commissions.filter(c => c.payment_status === "pending").reduce((a, c) => a + Number(c.commission_amount), 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold">Comissões</h1>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm rounded-2xl"><CardContent className="p-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-2 text-primary" />
          <p className="text-xl font-bold font-display">{fmt(total)}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm rounded-2xl"><CardContent className="p-4 text-center">
          <CheckCircle className="w-5 h-5 mx-auto mb-2 text-emerald-600" />
          <p className="text-xl font-bold font-display">{fmt(paid)}</p>
          <p className="text-xs text-muted-foreground">Pago</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm rounded-2xl"><CardContent className="p-4 text-center">
          <Clock className="w-5 h-5 mx-auto mb-2 text-amber-600" />
          <p className="text-xl font-bold font-display">{fmt(pending)}</p>
          <p className="text-xs text-muted-foreground">Pendente</p>
        </CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-sans font-medium">Histórico</CardTitle></CardHeader>
        <CardContent className="p-0">
          {commissions.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">Nenhuma comissão</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Venda</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Taxa</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Comissão</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Status</th>
                </tr></thead>
                <tbody>
                  {commissions.map(c => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3">{fmt(Number(c.sale_amount))}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.commission_rate}%</td>
                      <td className="px-4 py-3 font-semibold">{fmt(Number(c.commission_amount))}</td>
                      <td className="px-4 py-3">
                        <Badge variant={c.payment_status === "paid" ? "default" : "secondary"} className="text-xs gap-1">
                          {c.payment_status === "paid" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {c.payment_status === "paid" ? "Pago" : "Pendente"}
                        </Badge>
                      </td>
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
