import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Phone, Mail, ShoppingBag, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function SellerCustomers() {
  const { sellerId } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    const load = async () => {
      // Get seller's referral_code
      const { data: seller } = await supabase
        .from("sellers")
        .select("referral_code")
        .eq("id", sellerId)
        .maybeSingle();

      const referralCode = seller?.referral_code;

      // Fetch orders by seller_id
      const { data: ordersBySeller } = await supabase
        .from("orders")
        .select("customer_name, customer_email, customer_phone, total, created_at")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      // Fetch orders by referral_code (affiliate link)
      let ordersByReferral: any[] = [];
      if (referralCode) {
        const { data } = await supabase
          .from("orders")
          .select("customer_name, customer_email, customer_phone, total, created_at")
          .eq("referral_code", referralCode)
          .order("created_at", { ascending: false });
        ordersByReferral = data || [];
      }

      // Merge and deduplicate
      const allOrders = [...(ordersBySeller || []), ...ordersByReferral];
      const seen = new Set<string>();
      const uniqueOrders = allOrders.filter((o) => {
        const key = `${o.customer_email || ""}_${o.customer_name || ""}_${o.created_at}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Group by email/name
      const map = new Map<string, { name: string; email: string; phone: string; totalSpent: number; purchases: number; lastPurchase: string }>();
      uniqueOrders.forEach((o: any) => {
        const key = o.customer_email || o.customer_name || "unknown";
        const existing = map.get(key);
        if (existing) {
          existing.totalSpent += Number(o.total);
          existing.purchases += 1;
          if (o.created_at > existing.lastPurchase) existing.lastPurchase = o.created_at;
          if (!existing.phone && o.customer_phone) existing.phone = o.customer_phone;
        } else {
          map.set(key, {
            name: o.customer_name || "—",
            email: o.customer_email || "",
            phone: o.customer_phone || "",
            totalSpent: Number(o.total),
            purchases: 1,
            lastPurchase: o.created_at,
          });
        }
      });
      setCustomers(Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent));
      setLoading(false);
    };
    load();
  }, [sellerId]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const totalPurchases = customers.reduce((s, c) => s + c.purchases, 0);

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-60 rounded-2xl" /></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold">Meus Clientes</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">Clientes que compraram através dos seus links de afiliado</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Total de Clientes</p>
              <p className="text-xl font-bold">{customers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Total de Compras</p>
              <p className="text-xl font-bold">{totalPurchases}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Receita Total</p>
              <p className="text-xl font-bold">{fmt(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-sans font-medium">Nenhum cliente ainda</p>
              <p className="text-xs mt-1 max-w-xs text-center">Compartilhe seus links de afiliado para começar a atrair clientes</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {customers.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                        {(c.name || "?")[0]}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium font-sans truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.phone && (
                      <a
                        href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 hover:bg-emerald-200 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <div className="text-right ml-2">
                      <p className="text-sm font-semibold">{fmt(c.totalSpent)}</p>
                      <p className="text-xs text-muted-foreground">{c.purchases} compra{c.purchases > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
